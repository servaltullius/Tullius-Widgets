#include "WidgetHotkeys.h"

#include "JsonUtils.h"
#include "WidgetInteropContracts.h"
#include <keyhandler/keyhandler.h>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <mutex>

namespace TulliusWidgets::WidgetHotkeys {
namespace {

Callbacks g_callbacks{};
constexpr std::uint32_t kInsertScanCode = 0xD2;
constexpr std::uint32_t kEscapeScanCode = 0x01;
constexpr std::uint32_t kF11ScanCode = 0x57;

std::mutex g_bindingMutex;
std::atomic<std::int64_t> g_captureUntilMs{0};
constexpr std::int64_t kCaptureTimeoutMs = 15'000;
// The page may report the end of a capture before the game-thread task for the same key
// press runs; keep standing aside a little longer so that press is still ignored.
constexpr std::int64_t kCaptureReleaseGraceMs = 300;

std::int64_t NowMs()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count();
}

bool IsCaptureActive()
{
    return NowMs() < g_captureUntilMs.load(std::memory_order_acquire);
}
std::uint32_t g_settingsKey = 0;
std::uint32_t g_visibilityKey = 0;
KeyHandlerEvent g_settingsHandle = INVALID_REGISTRATION_HANDLE;
KeyHandlerEvent g_visibilityHandle = INVALID_REGISTRATION_HANDLE;

// Mirrors view/src/utils/hotkeys.ts: function keys, the navigation block, Pause/Scroll Lock
// and the numpad. Letters, digits and arrows are typed into the console or drive the
// settings panel itself.
bool IsBindableScanCode(std::uint32_t code)
{
    if (code >= 0x3B && code <= 0x44) {  // F1-F10
        return true;
    }
    if (code >= 0x47 && code <= 0x53) {  // Numpad 7-9, -, 4-6, +, 1-3, 0, .
        return true;
    }
    switch (code) {
    case 0x37:  // Numpad *
    case 0x46:  // Scroll Lock
    case 0x57:  // F11
    case 0x58:  // F12
    case 0xB5:  // Numpad /
    case 0xC5:  // Pause
    case 0xC7:  // Home
    case 0xC9:  // Page Up
    case 0xCF:  // End
    case 0xD1:  // Page Down
    case 0xD2:  // Insert
    case 0xD3:  // Delete
        return true;
    default:
        return false;
    }
}

// F1-F12, Pause and Scroll Lock never produce text, so only the console blocks them.
bool CanTypeText(std::uint32_t code)
{
    const bool functionKey = (code >= 0x3B && code <= 0x44) || code == 0x57 || code == 0x58;
    return !(functionKey || code == 0x46 || code == 0xC5);
}

// Keys pressed while the console or another text field takes typing are not hotkeys.
bool IsTypingIntoGame(std::uint32_t code)
{
    if (auto* ui = RE::UI::GetSingleton(); ui && ui->IsMenuOpen(RE::Console::MENU_NAME)) {
        return true;
    }
    if (!CanTypeText(code)) {
        return false;
    }
    auto* controlMap = RE::ControlMap::GetSingleton();
    if (!controlMap || controlMap->GetRuntimeData().textEntryCount <= 0) {
        return false;
    }
    // A leaked text-entry count (some menus forget to release it) would make the key look dead.
    static bool logged = false;
    if (!logged) {
        logged = true;
        logger::info("Hotkey 0x{:X} ignored while a text field takes typing (textEntryCount > 0)", code);
    }
    return true;
}

template <class Fn>
void DispatchToGameThread(Fn&& fn)
{
    if (auto* taskInterface = SKSE::GetTaskInterface()) {
        taskInterface->AddTask(std::forward<Fn>(fn));
        return;
    }
    std::forward<Fn>(fn)();
}

bool IsViewReady()
{
    return g_callbacks.isViewReady && g_callbacks.isViewReady();
}

bool IsGameLoaded()
{
    return g_callbacks.isGameLoaded && g_callbacks.isGameLoaded();
}

bool IsSettingsPanelOpen()
{
    return g_callbacks.isSettingsPanelOpen && g_callbacks.isSettingsPanelOpen();
}

bool FocusView()
{
    return g_callbacks.focusView && g_callbacks.focusView();
}

void UnfocusView()
{
    if (g_callbacks.unfocusView) {
        g_callbacks.unfocusView();
    }
}

bool InvokeScript(const char* script)
{
    if (g_callbacks.invokeScript) {
        return g_callbacks.invokeScript(script);
    }

    return false;
}

std::uint32_t CurrentSettingsKey()
{
    std::scoped_lock lock(g_bindingMutex);
    return g_settingsKey;
}

std::uint32_t CurrentVisibilityKey()
{
    std::scoped_lock lock(g_bindingMutex);
    return g_visibilityKey;
}

void OnSettingsKey()
{
    // Read at key-press time: the page may end the capture before the queued task runs.
    if (IsCaptureActive()) {
        return;
    }
    DispatchToGameThread([]() {
        if (!IsViewReady() || !IsGameLoaded()) {
            return;
        }
        // Our own panel may hold text focus, so only opening is blocked while typing.
        if (!IsSettingsPanelOpen() && IsTypingIntoGame(CurrentSettingsKey())) {
            return;
        }

        if (IsSettingsPanelOpen()) {
            InvokeScript(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript);
            UnfocusView();
            return;
        }

        if (!InvokeScript(TulliusWidgets::WidgetInteropContracts::kToggleSettingsScript)) {
            return;
        }

        // Focus on the next task tick so PrismaUI can finish opening the
        // settings overlay before it switches the game into cursor mode.
        DispatchToGameThread([]() {
            if (!IsViewReady() || !IsGameLoaded()) {
                return;
            }
            (void)FocusView();
        });
    });
}

void OnVisibilityKey()
{
    if (IsCaptureActive()) {
        return;
    }
    DispatchToGameThread([]() {
        if (IsViewReady() && IsGameLoaded()
            && (IsSettingsPanelOpen() || !IsTypingIntoGame(CurrentVisibilityKey()))) {
            InvokeScript(TulliusWidgets::WidgetInteropContracts::kToggleWidgetsVisibilityScript);
        }
    });
}

void BindKeys(std::uint32_t settingsKey, std::uint32_t visibilityKey)
{
    std::scoped_lock lock(g_bindingMutex);
    auto* keyHandler = KeyHandler::GetSingleton();
    if (!keyHandler) {
        return;
    }

    if (settingsKey != g_settingsKey || g_settingsHandle == INVALID_REGISTRATION_HANDLE) {
        if (g_settingsHandle != INVALID_REGISTRATION_HANDLE) {
            keyHandler->Unregister(g_settingsHandle);
        }
        g_settingsHandle = keyHandler->Register(settingsKey, KeyEventType::KEY_DOWN, &OnSettingsKey);
        g_settingsKey = settingsKey;
        logger::info("Settings panel hotkey bound to scan code 0x{:X}", settingsKey);
    }
    if (visibilityKey != g_visibilityKey || g_visibilityHandle == INVALID_REGISTRATION_HANDLE) {
        if (g_visibilityHandle != INVALID_REGISTRATION_HANDLE) {
            keyHandler->Unregister(g_visibilityHandle);
        }
        g_visibilityHandle = keyHandler->Register(visibilityKey, KeyEventType::KEY_DOWN, &OnVisibilityKey);
        g_visibilityKey = visibilityKey;
        logger::info("Widget visibility hotkey bound to scan code 0x{:X}", visibilityKey);
    }
}

}  // namespace

void RegisterDefaultHotkeys(const Callbacks& callbacks)
{
    g_callbacks = callbacks;

    KeyHandler::RegisterSink();
    auto* keyHandler = KeyHandler::GetSingleton();
    if (!keyHandler) {
        logger::error("Failed to initialize key handler for hotkeys");
        return;
    }

    (void)keyHandler->Register(kEscapeScanCode, KeyEventType::KEY_DOWN, []() {
        if (IsCaptureActive()) {
            return;  // Esc cancels the capture on the page instead of closing the panel.
        }
        DispatchToGameThread([]() {
            if (IsViewReady() && IsGameLoaded() && IsSettingsPanelOpen()) {
                InvokeScript(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript);
                UnfocusView();
            }
        });
    });

    BindKeys(kInsertScanCode, kF11ScanCode);
}

void ApplyHotkeysFromSettingsJson(std::string_view settingsJson)
{
    auto settingsKey = TulliusWidgets::JsonUtils::TryReadUIntField(settingsJson, "settingsHotkey").value_or(kInsertScanCode);
    auto visibilityKey = TulliusWidgets::JsonUtils::TryReadUIntField(settingsJson, "visibilityHotkey").value_or(kF11ScanCode);
    if (!IsBindableScanCode(settingsKey)) {
        settingsKey = kInsertScanCode;
    }
    if (!IsBindableScanCode(visibilityKey)) {
        visibilityKey = kF11ScanCode;
    }
    if (visibilityKey == settingsKey) {
        visibilityKey = settingsKey == kF11ScanCode ? kInsertScanCode : kF11ScanCode;
    }
    BindKeys(settingsKey, visibilityKey);
}

void SetCaptureActive(bool active)
{
    g_captureUntilMs.store(NowMs() + (active ? kCaptureTimeoutMs : kCaptureReleaseGraceMs), std::memory_order_release);
}

void ClearCapture()
{
    g_captureUntilMs.store(0, std::memory_order_release);
}

}  // namespace TulliusWidgets::WidgetHotkeys

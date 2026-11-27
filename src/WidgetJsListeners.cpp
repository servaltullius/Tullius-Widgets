#include "WidgetJsListeners.h"

#include "JsonUtils.h"
#include "NativeStorage.h"
#include "SelfTestRuntime.h"
#include "SelfTestSession.h"
#include "SettingsBackups.h"
#include "WidgetHotkeys.h"
#include "WidgetInteropContracts.h"

#include <optional>
#include <string>
#include <string_view>
#include <utility>

namespace TulliusWidgets::WidgetJsListeners {
namespace {

Callbacks g_callbacks{};

template <class Fn>
void DispatchToGameThread(Fn&& fn)
{
    if (auto* taskInterface = SKSE::GetTaskInterface()) {
        taskInterface->AddTask(std::forward<Fn>(fn));
        return;
    }
    std::forward<Fn>(fn)();
}

std::filesystem::path ResolveStorageBasePath()
{
    if (g_callbacks.resolveStorageBasePath) {
        return g_callbacks.resolveStorageBasePath();
    }
    return {};
}

void NotifyExportResult(bool success)
{
    if (!g_callbacks.invokeScript) return;
    (void)g_callbacks.invokeScript(success
        ? "onExportResult(true)"
        : "onExportResult(false)");
}

// Tells the view that a save kept the old settings file because the view never took it in.
void NotifyUnloadedBackup()
{
    const auto fileName = TulliusWidgets::NativeStorage::TakeUnloadedBackupNotice();
    if (!fileName || !g_callbacks.invokeScript) return;
    const auto script = TulliusWidgets::SettingsBackups::BuildBackupNoticeScript(
        TulliusWidgets::WidgetInteropContracts::kShowSettingsBackupNotice, *fileName);
    (void)g_callbacks.invokeScript(script.c_str());
}

void NotifySettingsSyncResult(bool success, std::optional<std::uint32_t> revision = std::nullopt)
{
    if (!g_callbacks.invokeScript) return;

    std::string script = std::string(TulliusWidgets::WidgetInteropContracts::kOnSettingsSyncResult)
        + '('
        + (success ? "true" : "false");
    if (revision.has_value()) {
        script += ", ";
        script += std::to_string(*revision);
    }
    script += ')';
    (void)g_callbacks.invokeScript(script.c_str());
}

void NotifyImportResult(bool success)
{
    if (!g_callbacks.invokeScript) return;
    (void)g_callbacks.invokeScript(success
        ? "onImportResult(true)"
        : "onImportResult(false)");
}

void UnfocusView()
{
    if (g_callbacks.unfocusView) {
        g_callbacks.unfocusView();
    }
}

void SetSettingsOpen(bool open)
{
    if (g_callbacks.setSettingsOpen) {
        g_callbacks.setSettingsOpen(open);
    }
}

bool TryImportSettingsToView(const std::string& json)
{
    if (!g_callbacks.interopCall) return false;
    return g_callbacks.interopCall(TulliusWidgets::WidgetInteropContracts::kImportSettingsFromNative, json.c_str());
}

bool IsPayloadWithinLimit(std::string_view payload, std::string_view label)
{
    if (payload.size() <= TulliusWidgets::NativeStorage::kMaxSettingsFileBytes) return true;

    logger::warn(
        "{} payload too large ({} bytes), rejecting",
        label,
        payload.size());
    return false;
}

}  // namespace

void Register(PRISMA_UI_API::IVPrismaUI1* prismaUI, PrismaView view, const Callbacks& callbacks)
{
    if (!prismaUI || view == 0) {
        logger::error("Cannot register JS listeners: invalid PrismaUI view");
        return;
    }

    g_callbacks = callbacks;

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnSettingsChanged, [](const char* data) -> void {
        if (!data) return;
        // A self-test session saves nothing and answers nothing: a failure answer would make the
        // page retry and show a save warning, which no scenario expects.
        if (TulliusWidgets::SelfTestSession::IsActive()) {
            DispatchToGameThread([]() { TulliusWidgets::SelfTestRuntime::LogIgnoredOnce("settings saves"); });
            return;
        }
        const std::string_view payloadView(data);
        if (!IsPayloadWithinLimit(payloadView, "Settings update")) {
            NotifySettingsSyncResult(false);
            return;
        }

        std::string payload(payloadView);
        const auto revision = TulliusWidgets::JsonUtils::TryReadUIntMember(payloadView, { "rev" });
        DispatchToGameThread([payload = std::move(payload), revision]() {
            TulliusWidgets::WidgetHotkeys::ApplyHotkeysFromSettingsJson(payload);
            const bool success = TulliusWidgets::NativeStorage::SaveSettingsAsync(
                ResolveStorageBasePath(),
                payload,
                [revision](bool saved) {
                    DispatchToGameThread([saved, revision]() {
                        NotifySettingsSyncResult(saved, revision);
                        NotifyUnloadedBackup();
                    });
                });
            if (!success) {
                logger::warn("Failed to queue async settings save from JS listener");
                NotifySettingsSyncResult(false, revision);
            }
        });
    });

    // The view could not take in the saved settings it was sent. Logged so the cause shows up the
    // next time; the backup in SettingsBackups.h keeps the file itself.
    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnSettingsLoadFailed, [](const char* data) -> void {
        constexpr std::size_t kMaxReasonLength = 500;
        const std::string_view reason = data ? std::string_view(data) : std::string_view("(no reason)");
        logger::warn(
            "The view could not apply the saved settings: {}",
            TulliusWidgets::SettingsBackups::ClampUtf8(reason, kMaxReasonLength));
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnExportSettings, [](const char* data) -> void {
        if (!data) return;
        if (TulliusWidgets::SelfTestSession::IsActive()) {
            DispatchToGameThread([]() {
                TulliusWidgets::SelfTestRuntime::LogIgnoredOnce("preset exports");
                NotifyExportResult(false);
            });
            return;
        }
        const std::string_view payload(data);
        if (!IsPayloadWithinLimit(payload, "Preset export")) {
            NotifyExportResult(false);
            return;
        }

        std::string copiedPayload(payload);
        DispatchToGameThread([copiedPayload = std::move(copiedPayload)]() {
            const bool success = TulliusWidgets::NativeStorage::ExportPreset(ResolveStorageBasePath(), copiedPayload);
            NotifyExportResult(success);
        });
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnImportSettings, [](const char*) -> void {
        DispatchToGameThread([]() {
            if (TulliusWidgets::SelfTestSession::IsActive()) {
                TulliusWidgets::SelfTestRuntime::LogIgnoredOnce("preset imports");
                NotifyImportResult(false);
                return;
            }
            std::string json;
            if (!TulliusWidgets::NativeStorage::LoadPreset(ResolveStorageBasePath(), json)) {
                NotifyImportResult(false);
                return;
            }

            if (!TryImportSettingsToView(json)) {
                logger::warn("Failed to send preset import payload to view (interop call failed)");
                NotifyImportResult(false);
                return;
            }

            logger::info("Preset import payload sent");
        });
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnRequestUnfocus, [](const char*) -> void {
        DispatchToGameThread([]() {
            UnfocusView();
        });
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnSettingsVisibilityChanged, [](const char* data) -> void {
        const std::string_view state = data ? std::string_view(data) : std::string_view{};
        const bool open = state == "open" || state == "true" || state == "1";
        DispatchToGameThread([open]() {
            SetSettingsOpen(open);
            if (!open) {
                TulliusWidgets::WidgetHotkeys::ClearCapture();
                TulliusWidgets::WidgetHotkeys::ClearPageEscape();
            }
        });
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnHotkeyCapture, [](const char* data) -> void {
        const bool active = data && std::string_view(data) == "1";
        TulliusWidgets::WidgetHotkeys::SetCaptureActive(active);
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnEscapeOwner, [](const char* data) -> void {
        const std::string_view state = data ? std::string_view(data) : std::string_view{};
        // "1" owned, "0" released, "0e" released by the page's own Esc keydown.
        TulliusWidgets::WidgetHotkeys::SetPageOwnsEscape(state == "1", state == "0e");
    });

    // Self-test session: the page reports its run (started, after each scenario, finished).
    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnSelfTestReport, [](const char* data) -> void {
        if (!data) return;
        std::string payload(data);
        DispatchToGameThread([payload = std::move(payload)]() {
            TulliusWidgets::SelfTestRuntime::HandleReport(payload);
        });
    });
}

}  // namespace TulliusWidgets::WidgetJsListeners

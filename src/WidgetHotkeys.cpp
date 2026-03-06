#include "WidgetHotkeys.h"

#include <keyhandler/keyhandler.h>

namespace TulliusWidgets::WidgetHotkeys {
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

    (void)keyHandler->Register(0xD2, KeyEventType::KEY_DOWN, []() {
        DispatchToGameThread([]() {
            if (!IsViewReady() || !IsGameLoaded()) {
                return;
            }

            if (IsSettingsPanelOpen()) {
                InvokeScript("closeSettings()");
                UnfocusView();
                return;
            }

            if (!InvokeScript("toggleSettings()")) {
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
    });

    (void)keyHandler->Register(0x01, KeyEventType::KEY_DOWN, []() {
        DispatchToGameThread([]() {
            if (IsViewReady() && IsGameLoaded() && IsSettingsPanelOpen()) {
                InvokeScript("closeSettings()");
                UnfocusView();
            }
        });
    });

    (void)keyHandler->Register(0x57, KeyEventType::KEY_DOWN, []() {
        DispatchToGameThread([]() {
            if (IsViewReady() && IsGameLoaded()) {
                InvokeScript("toggleWidgetsVisibility()");
            }
        });
    });

}

}  // namespace TulliusWidgets::WidgetHotkeys

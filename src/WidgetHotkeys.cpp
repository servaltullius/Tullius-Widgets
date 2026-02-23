#include "WidgetHotkeys.h"

#include <keyhandler/keyhandler.h>

namespace TulliusWidgets::WidgetHotkeys {
namespace {

Callbacks g_callbacks{};

bool IsViewReady()
{
    return g_callbacks.isViewReady && g_callbacks.isViewReady();
}

bool IsGameLoaded()
{
    return g_callbacks.isGameLoaded && g_callbacks.isGameLoaded();
}

bool ViewHasFocus()
{
    return g_callbacks.viewHasFocus && g_callbacks.viewHasFocus();
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

void InvokeScript(const char* script)
{
    if (g_callbacks.invokeScript) {
        (void)g_callbacks.invokeScript(script);
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

    (void)keyHandler->Register(0xD2, KeyEventType::KEY_DOWN, []() {
        if (IsViewReady() && IsGameLoaded()) {
            InvokeScript("toggleSettings()");
            if (!ViewHasFocus()) {
                FocusView();
            } else {
                UnfocusView();
            }
        }
    });

    (void)keyHandler->Register(0x01, KeyEventType::KEY_DOWN, []() {
        if (IsViewReady() && IsGameLoaded() && ViewHasFocus()) {
            InvokeScript("closeSettings()");
            UnfocusView();
        }
    });

    (void)keyHandler->Register(0x57, KeyEventType::KEY_DOWN, []() {
        if (IsViewReady() && IsGameLoaded()) {
            InvokeScript("toggleWidgetsVisibility()");
        }
    });
}

}  // namespace TulliusWidgets::WidgetHotkeys

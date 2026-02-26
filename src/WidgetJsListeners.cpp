#include "WidgetJsListeners.h"

#include "NativeStorage.h"

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
    (void)g_callbacks.invokeScript(success ? "onExportResult(true)" : "onExportResult(false)");
}

void NotifySettingsSyncResult(bool success)
{
    if (!g_callbacks.invokeScript) return;
    (void)g_callbacks.invokeScript(success ? "onSettingsSyncResult(true)" : "onSettingsSyncResult(false)");
}

void NotifyImportResult(bool success)
{
    if (!g_callbacks.invokeScript) return;
    (void)g_callbacks.invokeScript(success ? "onImportResult(true)" : "onImportResult(false)");
}

void UnfocusView()
{
    if (g_callbacks.unfocusView) {
        g_callbacks.unfocusView();
    }
}

bool TryImportSettingsToView(const std::string& json)
{
    if (!g_callbacks.interopCall) return false;
    return g_callbacks.interopCall("importSettingsFromNative", json.c_str());
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

    prismaUI->RegisterJSListener(view, "onSettingsChanged", [](const char* data) -> void {
        if (!data) return;
        const std::string_view payloadView(data);
        if (!IsPayloadWithinLimit(payloadView, "Settings update")) {
            NotifySettingsSyncResult(false);
            return;
        }

        std::string payload(payloadView);
        DispatchToGameThread([payload = std::move(payload)]() {
            const bool success = TulliusWidgets::NativeStorage::SaveSettings(ResolveStorageBasePath(), payload);
            if (!success) {
                logger::warn("Failed to save settings from JS listener");
            }
            NotifySettingsSyncResult(success);
        });
    });

    prismaUI->RegisterJSListener(view, "onExportSettings", [](const char* data) -> void {
        if (!data) return;
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

    prismaUI->RegisterJSListener(view, "onImportSettings", [](const char*) -> void {
        DispatchToGameThread([]() {
            std::string json;
            if (!TulliusWidgets::NativeStorage::LoadPreset(ResolveStorageBasePath(), json)) {
                NotifyImportResult(false);
                return;
            }

            if (!TryImportSettingsToView(json)) {
                NotifyImportResult(false);
                return;
            }

            logger::info("Preset import payload sent");
        });
    });

    prismaUI->RegisterJSListener(view, "onRequestUnfocus", [](const char*) -> void {
        DispatchToGameThread([]() {
            UnfocusView();
        });
    });
}

}  // namespace TulliusWidgets::WidgetJsListeners

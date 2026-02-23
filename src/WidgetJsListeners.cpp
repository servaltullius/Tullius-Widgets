#include "WidgetJsListeners.h"

#include "NativeStorage.h"

#include <string>
#include <string_view>

namespace TulliusWidgets::WidgetJsListeners {
namespace {

Callbacks g_callbacks{};

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
        (void)TulliusWidgets::NativeStorage::SaveSettings(ResolveStorageBasePath(), data);
    });

    prismaUI->RegisterJSListener(view, "onExportSettings", [](const char* data) -> void {
        if (!data) return;
        const std::string_view payload(data);
        if (!IsPayloadWithinLimit(payload, "Preset export")) {
            NotifyExportResult(false);
            return;
        }
        const bool success = TulliusWidgets::NativeStorage::ExportPreset(ResolveStorageBasePath(), data);
        NotifyExportResult(success);
    });

    prismaUI->RegisterJSListener(view, "onImportSettings", [](const char*) -> void {
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

    prismaUI->RegisterJSListener(view, "onRequestUnfocus", [](const char*) -> void {
        UnfocusView();
    });
}

}  // namespace TulliusWidgets::WidgetJsListeners

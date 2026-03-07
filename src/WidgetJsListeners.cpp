#include "WidgetJsListeners.h"

#include "JsonUtils.h"
#include "NativeStorage.h"
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
        const std::string_view payloadView(data);
        if (!IsPayloadWithinLimit(payloadView, "Settings update")) {
            NotifySettingsSyncResult(false);
            return;
        }

        std::string payload(payloadView);
        const auto revision = TulliusWidgets::JsonUtils::TryReadUIntField(payloadView, "rev");
        DispatchToGameThread([payload = std::move(payload), revision]() {
            const bool success = TulliusWidgets::NativeStorage::SaveSettingsAsync(
                ResolveStorageBasePath(),
                payload,
                [revision](bool saved) {
                    DispatchToGameThread([saved, revision]() {
                        NotifySettingsSyncResult(saved, revision);
                    });
                });
            if (!success) {
                logger::warn("Failed to queue async settings save from JS listener");
                NotifySettingsSyncResult(false, revision);
            }
        });
    });

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnExportSettings, [](const char* data) -> void {
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

    prismaUI->RegisterJSListener(view, TulliusWidgets::WidgetInteropContracts::kOnImportSettings, [](const char*) -> void {
        DispatchToGameThread([]() {
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
        });
    });
}

}  // namespace TulliusWidgets::WidgetJsListeners

#include "WidgetBootstrap.h"

namespace TulliusWidgets::WidgetBootstrap {
namespace {

Callbacks g_callbacks{};

void OnViewDomReady(PrismaView view)
{
    logger::info("TulliusWidgets view ready (id: {})", view);

    if (g_callbacks.setView) {
        g_callbacks.setView(view);
    }
    if (g_callbacks.setViewDomReady) {
        g_callbacks.setViewDomReady(true);
    }
    if (g_callbacks.sendRuntimeDiagnostics) {
        g_callbacks.sendRuntimeDiagnostics();
    }
    if (g_callbacks.sendHUDColor) {
        g_callbacks.sendHUDColor();
    }
    if (g_callbacks.sendSettings) {
        g_callbacks.sendSettings();
    }
    if (g_callbacks.sendStatsForced) {
        g_callbacks.sendStatsForced();
    }
}

}  // namespace

bool InitializeOnDataLoaded(PRISMA_UI_API::IVPrismaUI1*& prismaUI, const Callbacks& callbacks)
{
    g_callbacks = callbacks;

    prismaUI = static_cast<PRISMA_UI_API::IVPrismaUI1*>(
        PRISMA_UI_API::RequestPluginAPI(PRISMA_UI_API::InterfaceVersion::V1));
    if (!prismaUI) {
        logger::error("Failed to initialize PrismaUI API. Is PrismaUI installed?");
        return false;
    }

    logger::info("PrismaUI API initialized");

    if (g_callbacks.setViewDomReady) {
        g_callbacks.setViewDomReady(false);
    }

    const auto createdView = prismaUI->CreateView("TulliusWidgets/index.html", OnViewDomReady);
    if (g_callbacks.setView) {
        g_callbacks.setView(createdView);
    }

    if (!g_callbacks.isViewReady || !g_callbacks.isViewReady()) {
        logger::error("Failed to create TulliusWidgets view. Widget initialization aborted.");
        if (g_callbacks.setView) {
            g_callbacks.setView(0);
        }
        if (g_callbacks.setViewDomReady) {
            g_callbacks.setViewDomReady(false);
        }
        return false;
    }

    if (g_callbacks.hideView) {
        g_callbacks.hideView();
    }
    if (g_callbacks.sendRuntimeDiagnostics) {
        g_callbacks.sendRuntimeDiagnostics();
    }
    if (g_callbacks.registerJsListeners) {
        g_callbacks.registerJsListeners();
    }
    if (g_callbacks.registerEventSinks) {
        g_callbacks.registerEventSinks();
    }
    if (g_callbacks.startHeartbeat) {
        g_callbacks.startHeartbeat();
    }
    if (g_callbacks.registerHotkeys) {
        g_callbacks.registerHotkeys();
    }

    return true;
}

void SyncOnGameLoaded(const Callbacks& callbacks)
{
    if (callbacks.setGameLoaded) {
        callbacks.setGameLoaded(true);
    }

    const bool shown = callbacks.showView && callbacks.showView();
    if (shown) {
        if (callbacks.sendRuntimeDiagnostics) {
            callbacks.sendRuntimeDiagnostics();
        }
        if (callbacks.sendHUDColor) {
            callbacks.sendHUDColor();
        }
        if (callbacks.sendSettings) {
            callbacks.sendSettings();
        }
        if (callbacks.sendStatsForced) {
            callbacks.sendStatsForced();
        }
    } else {
        logger::warn("View not ready on game load; skipping initial UI sync");
    }

    logger::info("Game loaded - widgets visible");
}

}  // namespace TulliusWidgets::WidgetBootstrap

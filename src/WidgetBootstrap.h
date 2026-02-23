#pragma once

#include "PrismaUI_API.h"

namespace TulliusWidgets::WidgetBootstrap {

struct Callbacks {
    void (*setView)(PrismaView) = nullptr;
    void (*setViewDomReady)(bool) = nullptr;
    void (*setGameLoaded)(bool) = nullptr;
    bool (*isViewReady)() = nullptr;
    bool (*showView)() = nullptr;
    void (*hideView)() = nullptr;
    void (*sendRuntimeDiagnostics)() = nullptr;
    void (*sendHUDColor)() = nullptr;
    void (*sendSettings)() = nullptr;
    void (*sendStatsForced)() = nullptr;
    void (*registerJsListeners)() = nullptr;
    void (*registerEventSinks)() = nullptr;
    void (*startHeartbeat)() = nullptr;
    void (*registerHotkeys)() = nullptr;
};

bool InitializeOnDataLoaded(PRISMA_UI_API::IVPrismaUI1*& prismaUI, const Callbacks& callbacks);
void SyncOnGameLoaded(const Callbacks& callbacks);

}  // namespace TulliusWidgets::WidgetBootstrap

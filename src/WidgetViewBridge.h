#pragma once

#include "PrismaUI_API.h"

#include <atomic>

namespace TulliusWidgets::WidgetViewBridge {

class Runtime {
public:
    void SetApi(PRISMA_UI_API::IVPrismaUI1* api);
    PRISMA_UI_API::IVPrismaUI1* GetApi() const;

    void SetView(PrismaView view);
    PrismaView GetView() const;

    void SetDomReady(bool ready);
    bool IsDomReady() const;

    bool IsViewReady() const;
    bool IsInteropReady() const;

    bool InteropCall(const char* functionName, const char* argument) const;
    bool Invoke(const char* script) const;
    bool Show() const;
    bool Hide() const;
    bool HasFocus() const;
    bool Focus() const;
    void Unfocus() const;

private:
    PrismaView LoadValidView() const;

    PRISMA_UI_API::IVPrismaUI1* api_{ nullptr };
    std::atomic<PrismaView> view_{ 0 };
    std::atomic<bool> viewDomReady_{ false };
};

}  // namespace TulliusWidgets::WidgetViewBridge

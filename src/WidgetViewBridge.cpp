#include "WidgetViewBridge.h"

namespace TulliusWidgets::WidgetViewBridge {

void Runtime::SetApi(PRISMA_UI_API::IVPrismaUI1* api)
{
    api_ = api;
}

PRISMA_UI_API::IVPrismaUI1* Runtime::GetApi() const
{
    return api_;
}

void Runtime::SetView(PrismaView view)
{
    view_.store(view, std::memory_order_release);
}

PrismaView Runtime::GetView() const
{
    return view_.load(std::memory_order_acquire);
}

void Runtime::SetDomReady(bool ready)
{
    viewDomReady_.store(ready, std::memory_order_release);
}

bool Runtime::IsDomReady() const
{
    return viewDomReady_.load(std::memory_order_acquire);
}

PrismaView Runtime::LoadValidView() const
{
    if (!api_) {
        return 0;
    }

    const auto view = GetView();
    if (view == 0 || !api_->IsValid(view)) {
        return 0;
    }

    return view;
}

bool Runtime::IsViewReady() const
{
    return LoadValidView() != 0;
}

bool Runtime::IsInteropReady() const
{
    return IsDomReady() && IsViewReady();
}

bool Runtime::InteropCall(const char* functionName, const char* argument) const
{
    if (!IsDomReady()) {
        return false;
    }

    const auto view = LoadValidView();
    if (view == 0) {
        return false;
    }

    api_->InteropCall(view, functionName, argument ? argument : "");
    return true;
}

bool Runtime::Invoke(const char* script) const
{
    if (!IsDomReady()) {
        return false;
    }

    const auto view = LoadValidView();
    if (view == 0) {
        return false;
    }

    api_->Invoke(view, script);
    return true;
}

bool Runtime::Show() const
{
    const auto view = LoadValidView();
    if (view == 0) {
        return false;
    }

    api_->Show(view);
    return true;
}

bool Runtime::Hide() const
{
    const auto view = LoadValidView();
    if (view == 0) {
        return false;
    }

    api_->Hide(view);
    return true;
}

bool Runtime::HasFocus() const
{
    const auto view = LoadValidView();
    if (view == 0) {
        return false;
    }

    return api_->HasFocus(view);
}

bool Runtime::Focus(bool pauseGame, bool disableFocusMenu) const
{
    const auto view = LoadValidView();
    if (view == 0) {
        return false;
    }

    api_->Show(view);
    if (api_->HasFocus(view)) {
        return true;
    }

    return api_->Focus(view, pauseGame, disableFocusMenu);
}

void Runtime::Unfocus() const
{
    const auto view = LoadValidView();
    if (view == 0) {
        return;
    }

    api_->Unfocus(view);
}

}  // namespace TulliusWidgets::WidgetViewBridge

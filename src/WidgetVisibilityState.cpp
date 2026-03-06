#include "WidgetVisibilityState.h"

#include "RE/P/PlayerCamera.h"

#include <algorithm>
#include <array>
#include <atomic>
#include <cctype>
#include <string>
#include <string_view>

namespace TulliusWidgets::WidgetVisibilityState {
namespace {

std::atomic<std::uint32_t> g_transientHideMenuCount{ 0 };

static constexpr std::array<std::string_view, 19> kKnownHiddenMenus = {
    RE::InventoryMenu::MENU_NAME,
    RE::MagicMenu::MENU_NAME,
    RE::MapMenu::MENU_NAME,
    RE::StatsMenu::MENU_NAME,
    RE::JournalMenu::MENU_NAME,
    RE::TweenMenu::MENU_NAME,
    RE::ContainerMenu::MENU_NAME,
    RE::BarterMenu::MENU_NAME,
    RE::GiftMenu::MENU_NAME,
    RE::LockpickingMenu::MENU_NAME,
    RE::BookMenu::MENU_NAME,
    RE::FavoritesMenu::MENU_NAME,
    RE::Console::MENU_NAME,
    RE::CraftingMenu::MENU_NAME,
    RE::TrainingMenu::MENU_NAME,
    RE::SleepWaitMenu::MENU_NAME,
    RE::RaceSexMenu::MENU_NAME,
    RE::LevelUpMenu::MENU_NAME,
    RE::LoadingMenu::MENU_NAME
};

static constexpr std::array<std::string_view, 4> kTransientHideMenuTokens = {
    "photo",
    "screenshot",
    "capture",
    "freecamera"
};

std::string ToLowerAscii(std::string_view text)
{
    std::string lowered;
    lowered.reserve(text.size());
    for (char ch : text) {
        lowered.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));
    }
    return lowered;
}

bool IsKnownHiddenMenu(std::string_view menuName)
{
    return std::any_of(
        kKnownHiddenMenus.begin(),
        kKnownHiddenMenus.end(),
        [menuName](const auto& knownMenuName) { return menuName == knownMenuName; });
}

bool IsTransientHideMenu(std::string_view menuName)
{
    const std::string lowered = ToLowerAscii(menuName);
    return std::any_of(
        kTransientHideMenuTokens.begin(),
        kTransientHideMenuTokens.end(),
        [&lowered](const auto& token) { return lowered.find(token) != std::string::npos; });
}

bool IsAnyKnownHiddenMenuOpen(RE::UI* ui)
{
    if (!ui) {
        return false;
    }

    return std::any_of(
        kKnownHiddenMenus.begin(),
        kKnownHiddenMenus.end(),
        [ui](const auto& menuName) { return ui->IsMenuOpen(menuName); });
}

bool IsFreeCameraModeActive()
{
    const auto* playerCamera = RE::PlayerCamera::GetSingleton();
    return playerCamera && playerCamera->IsInFreeCameraMode();
}

}  // namespace

bool ShouldHideForMenu(const RE::BSFixedString& menuName)
{
    const std::string_view menuNameView = menuName;
    return IsKnownHiddenMenu(menuNameView) || IsTransientHideMenu(menuNameView);
}

void NoteMenuOpenClose(const RE::BSFixedString& menuName, bool opening)
{
    if (!IsTransientHideMenu(std::string_view(menuName))) {
        return;
    }

    if (opening) {
        g_transientHideMenuCount.fetch_add(1, std::memory_order_acq_rel);
        return;
    }

    auto currentCount = g_transientHideMenuCount.load(std::memory_order_acquire);
    while (currentCount > 0) {
        if (g_transientHideMenuCount.compare_exchange_weak(
                currentCount,
                currentCount - 1,
                std::memory_order_acq_rel,
                std::memory_order_acquire)) {
            break;
        }
    }
}

bool IsBlockingUiState(RE::UI* ui)
{
    if (!ui) {
        return false;
    }

    return !ui->IsShowingMenus()
        || ui->GameIsPaused()
        || ui->IsModalMenuOpen()
        || ui->IsApplicationMenuOpen()
        || IsFreeCameraModeActive()
        || IsAnyKnownHiddenMenuOpen(ui)
        || g_transientHideMenuCount.load(std::memory_order_acquire) > 0;
}

void Reset()
{
    g_transientHideMenuCount.store(0, std::memory_order_release);
}

}  // namespace TulliusWidgets::WidgetVisibilityState

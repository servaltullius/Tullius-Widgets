#include "WidgetVisibilityState.h"

#include "MenuNameMatch.h"
#include "RE/P/PlayerCamera.h"

#include <algorithm>
#include <array>
#include <atomic>
#include <mutex>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace TulliusWidgets::WidgetVisibilityState {
namespace {

// Names of transient hide menus (photo/screenshot/...) that are currently
// open. Tracked by name rather than as a bare counter so a lost close event
// (for example one whose menu name was corrupted by another plugin) can be
// healed by asking the UI whether each tracked menu is still open.
std::mutex g_transientMenusMutex;
std::vector<std::string> g_openTransientMenus;
// Mirror of g_openTransientMenus.size() for the lock-free fast path.
std::atomic<std::uint32_t> g_transientHideMenuCount{ 0 };
// Set when a close event arrived with a corrupted name while transient menus
// were tracked. Reconciliation is limited to that case so menus that only
// exist as synthetic events (not registered with the UI) keep working.
std::atomic<bool> g_reconcileTransientMenus{ false };
std::atomic<FreeCameraDisplay> g_freeCameraDisplay{ FreeCameraDisplay::kHide };

static constexpr std::array<std::string_view, 20> kKnownHiddenMenus = {
    RE::InventoryMenu::MENU_NAME,
    RE::MagicMenu::MENU_NAME,
    RE::MapMenu::MENU_NAME,
    RE::StatsMenu::MENU_NAME,
    RE::JournalMenu::MENU_NAME,
    RE::TweenMenu::MENU_NAME,
    RE::ContainerMenu::MENU_NAME,
    RE::BarterMenu::MENU_NAME,
    RE::GiftMenu::MENU_NAME,
    RE::DialogueMenu::MENU_NAME,
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

bool IsKnownHiddenMenu(std::string_view trustedMenuName)
{
    return std::any_of(
        kKnownHiddenMenus.begin(),
        kKnownHiddenMenus.end(),
        [trustedMenuName](const auto& knownMenuName) { return trustedMenuName == knownMenuName; });
}

bool IsTransientHideMenu(std::string_view trustedMenuName)
{
    return MenuNameMatch::ContainsAnyLoweredToken(trustedMenuName, kTransientHideMenuTokens);
}

// Menu names come from other plugins' BSFixedStrings and may be corrupted
// (a freed string-pool entry reporting a multi-megabyte length). Never scan a
// name that fails validation.
std::optional<std::string_view> TrustedMenuName(const RE::BSFixedString& menuName)
{
    return MenuNameMatch::TrustedMenuName(std::string_view(menuName));
}

void PublishTransientMenuCountLocked()
{
    if (g_openTransientMenus.empty()) {
        g_reconcileTransientMenus.store(false, std::memory_order_release);
    }
    g_transientHideMenuCount.store(
        static_cast<std::uint32_t>(g_openTransientMenus.size()),
        std::memory_order_release);
}

// After a corrupted close event, drops tracked transient menus the UI no
// longer reports as open. The reconcile flag stays set until nothing is
// tracked, so a close event dispatched before the menu left the stack is
// still healed by the next visibility check.
void ReconcileTransientMenus(RE::UI* ui)
{
    if (!ui || !g_reconcileTransientMenus.load(std::memory_order_acquire)) {
        return;
    }

    std::scoped_lock lock(g_transientMenusMutex);
    std::erase_if(g_openTransientMenus, [ui](const std::string& menuName) {
        return !ui->IsMenuOpen(menuName);
    });
    PublishTransientMenuCountLocked();
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

}  // namespace

bool SetFreeCameraDisplay(FreeCameraDisplay display)
{
    return g_freeCameraDisplay.exchange(display, std::memory_order_acq_rel) != display;
}

bool IsFreeCameraModeActive()
{
    const auto* playerCamera = RE::PlayerCamera::GetSingleton();
    return playerCamera && playerCamera->IsInFreeCameraMode();
}

bool ShouldHideForMenu(const RE::BSFixedString& menuName)
{
    const auto trustedMenuName = TrustedMenuName(menuName);
    return trustedMenuName
        && (IsKnownHiddenMenu(*trustedMenuName) || IsTransientHideMenu(*trustedMenuName));
}

void NoteMenuOpenClose(const RE::BSFixedString& menuName, bool opening)
{
    const auto trustedMenuName = TrustedMenuName(menuName);
    if (!trustedMenuName) {
        // A corrupted name may be the close event of a tracked transient
        // menu; reconcile with the UI instead of leaving the widgets hidden.
        if (!opening && g_transientHideMenuCount.load(std::memory_order_acquire) > 0) {
            logger::warn("Menu close event carried a corrupted menu name; reconciling transient hide menus");
            g_reconcileTransientMenus.store(true, std::memory_order_release);
            ReconcileTransientMenus(RE::UI::GetSingleton());
        }
        return;
    }

    if (!IsTransientHideMenu(*trustedMenuName)) {
        return;
    }

    std::scoped_lock lock(g_transientMenusMutex);
    if (opening) {
        g_openTransientMenus.emplace_back(*trustedMenuName);
    } else if (const auto it = std::find(g_openTransientMenus.begin(), g_openTransientMenus.end(), *trustedMenuName);
               it != g_openTransientMenus.end()) {
        g_openTransientMenus.erase(it);
    }
    PublishTransientMenuCountLocked();
}

bool IsBlockingUiState(RE::UI* ui, bool allowFocusedWidgetMenu)
{
    // The settings panel stays usable in a free camera scene: the focused view owns the screen.
    const bool freeCameraBlocks = ui && !allowFocusedWidgetMenu
        && g_freeCameraDisplay.load(std::memory_order_acquire) == FreeCameraDisplay::kHide
        && IsFreeCameraModeActive();
    return freeCameraBlocks || IsBlockingUiStateExceptFreeCamera(ui, allowFocusedWidgetMenu);
}

bool IsBlockingUiStateExceptFreeCamera(RE::UI* ui, bool allowFocusedWidgetMenu)
{
    if (!ui) {
        return false;
    }

    const bool genericUiBlockersActive = !allowFocusedWidgetMenu && (
        !ui->IsShowingMenus()
        || ui->GameIsPaused()
        || ui->IsModalMenuOpen()
        || ui->IsApplicationMenuOpen());

    if (genericUiBlockersActive || IsAnyKnownHiddenMenuOpen(ui)) {
        return true;
    }

    ReconcileTransientMenus(ui);
    return g_transientHideMenuCount.load(std::memory_order_acquire) > 0;
}

void Reset()
{
    std::scoped_lock lock(g_transientMenusMutex);
    g_openTransientMenus.clear();
    PublishTransientMenuCountLocked();
}

}  // namespace TulliusWidgets::WidgetVisibilityState

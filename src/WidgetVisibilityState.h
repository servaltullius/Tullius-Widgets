#pragma once

#include "RE/B/BSFixedString.h"

namespace RE {
class UI;
}

namespace TulliusWidgets::WidgetVisibilityState {

enum class FreeCameraDisplay { kHide, kVitals, kAll };

bool SetFreeCameraDisplay(FreeCameraDisplay display);
bool IsFreeCameraModeActive();
bool ShouldHideForMenu(const RE::BSFixedString& menuName);
void NoteMenuOpenClose(const RE::BSFixedString& menuName, bool opening);
bool IsBlockingUiState(RE::UI* ui, bool allowFocusedWidgetMenu = false);
bool IsBlockingUiStateExceptFreeCamera(RE::UI* ui, bool allowFocusedWidgetMenu);
void Reset();

}  // namespace TulliusWidgets::WidgetVisibilityState

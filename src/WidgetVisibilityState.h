#pragma once

#include "RE/B/BSFixedString.h"

namespace RE {
class UI;
}

namespace TulliusWidgets::WidgetVisibilityState {

bool ShouldHideForMenu(const RE::BSFixedString& menuName);
void NoteMenuOpenClose(const RE::BSFixedString& menuName, bool opening);
bool IsBlockingUiState(RE::UI* ui, bool allowFocusedWidgetMenu = false);
void Reset();

}  // namespace TulliusWidgets::WidgetVisibilityState

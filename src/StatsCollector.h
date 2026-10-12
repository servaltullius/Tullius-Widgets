#pragma once

#include <cstdint>
#include <string>

namespace TulliusWidgets {

class StatsCollector {
public:
    static std::string CollectStats();
    // Remembers the last potion the player drank so the HUD can show how many are left.
    static void NoteConsumedPotion(std::uint32_t formId);
    // Restarts the live play-time count (save loaded or new game).
    static void ResetPlaytimeTracking();
};

}  // namespace TulliusWidgets

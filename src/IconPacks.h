#pragma once

#include <filesystem>
#include <string>

namespace TulliusWidgets::IconPacks {

// PrismaUI/views/TulliusWidgets/icon-packs under the game's Data folder.
std::filesystem::path GetIconPacksDirectory(const std::filesystem::path& gameRootPath);

// {"packs":[{"id":"<folder>","icons":["health","slot-sword",...],"manifest":"<pack.json text>"}]}
// The view validates every field again before it builds a URL from it; a Prisma UI view
// cannot list folders itself, which is why the plugin does it.
std::string BuildIconPacksJson(const std::filesystem::path& gameRootPath, std::size_t* outPackCount = nullptr);

}  // namespace TulliusWidgets::IconPacks

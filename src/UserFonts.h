#pragma once

#include <cstddef>
#include <filesystem>
#include <string>

namespace TulliusWidgets::UserFonts {

std::filesystem::path GetUserFontsDirectory(const std::filesystem::path& gameRootPath);

// The view cannot enumerate local files. It receives folder and file names and validates them again.
std::string BuildUserFontsJson(const std::filesystem::path& gameRootPath, std::size_t* outFontCount = nullptr);

}  // namespace TulliusWidgets::UserFonts

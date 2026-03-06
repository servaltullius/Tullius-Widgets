#pragma once

#include <cstdint>
#include <filesystem>
#include <functional>
#include <string>
#include <string_view>

namespace TulliusWidgets::NativeStorage {

inline constexpr std::uintmax_t kMaxSettingsFileBytes = 256 * 1024;
using SaveCompletion = std::function<void(bool success)>;

std::filesystem::path GetSettingsDirectoryPath(const std::filesystem::path& gameRootPath);
std::filesystem::path GetSettingsPath(const std::filesystem::path& gameRootPath);
std::filesystem::path GetPresetPath(const std::filesystem::path& gameRootPath);

bool SaveSettings(const std::filesystem::path& gameRootPath, std::string_view jsonData);
bool SaveSettingsAsync(
    const std::filesystem::path& gameRootPath,
    std::string_view jsonData,
    SaveCompletion onComplete = {});
std::string LoadSettings(const std::filesystem::path& gameRootPath);
bool ExportPreset(const std::filesystem::path& gameRootPath, std::string_view jsonData);
bool LoadPreset(const std::filesystem::path& gameRootPath, std::string& outJson);

}  // namespace TulliusWidgets::NativeStorage

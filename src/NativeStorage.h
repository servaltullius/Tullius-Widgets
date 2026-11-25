#pragma once

#include <cstdint>
#include <filesystem>
#include <functional>
#include <optional>
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
/** The settings file is there, or its presence cannot be told (then it may be). */
bool SettingsFileExists(const std::filesystem::path& gameRootPath);
/**
 * The file name of a settings backup made because the view saved over a file it never took in
 * (see SettingsBackups.h), once; empty when there is none to report.
 */
std::optional<std::string> TakeUnloadedBackupNotice();
bool ExportPreset(const std::filesystem::path& gameRootPath, std::string_view jsonData);
bool LoadPreset(const std::filesystem::path& gameRootPath, std::string& outJson);

}  // namespace TulliusWidgets::NativeStorage

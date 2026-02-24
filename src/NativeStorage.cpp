#include "NativeStorage.h"

#include <atomic>
#include <condition_variable>
#include <fstream>
#include <mutex>
#include <optional>
#include <thread>

namespace TulliusWidgets::NativeStorage {
namespace {

struct PendingSettingsWrite {
    std::filesystem::path gameRootPath;
    std::string jsonData;
};

std::mutex g_asyncSettingsMutex;
std::condition_variable_any g_asyncSettingsCv;
std::optional<PendingSettingsWrite> g_pendingSettingsWrite;
std::atomic<bool> g_asyncSettingsWriterStarted{ false };
std::jthread g_asyncSettingsWriter;

bool EnsureSettingsDirectory(const std::filesystem::path& gameRootPath)
{
    const auto dirPath = GetSettingsDirectoryPath(gameRootPath);
    std::error_code ec;
    std::filesystem::create_directories(dirPath, ec);
    if (ec) {
        logger::error("Failed to create settings directory '{}': {}", dirPath.generic_string(), ec.message());
        return false;
    }
    return true;
}

bool ReadTextFileWithLimit(
    const std::filesystem::path& path,
    std::uintmax_t maxBytes,
    std::string_view label,
    std::string& out)
{
    out.clear();

    std::error_code ec;
    if (!std::filesystem::exists(path, ec)) {
        if (ec) {
            logger::warn("Failed to check {} file '{}': {}", label, path.string(), ec.message());
        }
        return false;
    }

    const auto bytes = std::filesystem::file_size(path, ec);
    if (ec) {
        logger::warn("Failed to read {} file size '{}': {}", label, path.string(), ec.message());
        return false;
    }
    if (bytes == 0) return false;
    if (bytes > maxBytes) {
        logger::warn("{} file too large ({} bytes), ignoring: {}", label, bytes, path.string());
        return false;
    }

    try {
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) {
            logger::warn("Failed to open {} file '{}'", label, path.string());
            return false;
        }

        const auto expectedBytes = static_cast<std::size_t>(bytes);
        out.resize(expectedBytes);
        file.read(out.data(), static_cast<std::streamsize>(out.size()));
        const auto readBytes = static_cast<std::size_t>(file.gcount());
        out.resize(readBytes);
        if (readBytes != expectedBytes) {
            logger::warn(
                "Incomplete read for {} file '{}' (expected {} bytes, got {})",
                label,
                path.string(),
                expectedBytes,
                readBytes);
            out.clear();
            return false;
        }
        return true;
    } catch (const std::exception& e) {
        logger::warn("Failed to load {} file '{}': {}", label, path.string(), e.what());
        return false;
    }
}

bool ReplaceFileWithRollback(
    const std::filesystem::path& tempPath,
    const std::filesystem::path& targetPath,
    std::string_view label)
{
    std::error_code ec;
    std::filesystem::rename(tempPath, targetPath, ec);
    if (!ec) {
        return true;
    }

    std::error_code existsEc;
    const bool targetExists = std::filesystem::exists(targetPath, existsEc);
    if (existsEc) {
        logger::error(
            "Failed to check existing {} file '{}' before replace: {}",
            label,
            targetPath.string(),
            existsEc.message());
        std::error_code cleanupEc;
        std::filesystem::remove(tempPath, cleanupEc);
        return false;
    }

    auto backupPath = targetPath;
    backupPath += ".bak";

    if (targetExists) {
        std::error_code removeBackupEc;
        std::filesystem::remove(backupPath, removeBackupEc);

        std::error_code backupEc;
        std::filesystem::rename(targetPath, backupPath, backupEc);
        if (backupEc) {
            logger::error(
                "Failed to move existing {} file '{}' to backup '{}': {}",
                label,
                targetPath.string(),
                backupPath.string(),
                backupEc.message());
            std::error_code cleanupEc;
            std::filesystem::remove(tempPath, cleanupEc);
            return false;
        }
    }

    ec.clear();
    std::filesystem::rename(tempPath, targetPath, ec);
    if (ec) {
        logger::error(
            "Failed to replace {} file '{}' from temp '{}': {}",
            label,
            targetPath.string(),
            tempPath.string(),
            ec.message());

        if (targetExists) {
            std::error_code restoreEc;
            std::filesystem::rename(backupPath, targetPath, restoreEc);
            if (restoreEc) {
                logger::error(
                    "Failed to restore previous {} file '{}' from backup '{}': {}",
                    label,
                    targetPath.string(),
                    backupPath.string(),
                    restoreEc.message());
            }
        }

        std::error_code cleanupEc;
        std::filesystem::remove(tempPath, cleanupEc);
        return false;
    }

    if (targetExists) {
        std::error_code cleanupBackupEc;
        std::filesystem::remove(backupPath, cleanupBackupEc);
        if (cleanupBackupEc) {
            logger::warn(
                "Failed to remove {} backup file '{}': {}",
                label,
                backupPath.string(),
                cleanupBackupEc.message());
        }
    }

    return true;
}

bool SaveSettingsSync(const std::filesystem::path& gameRootPath, std::string_view jsonData)
{
    if (!EnsureSettingsDirectory(gameRootPath)) return false;

    const auto settingsPath = GetSettingsPath(gameRootPath);
    const auto jsonLen = jsonData.size();
    if (jsonLen > kMaxSettingsFileBytes) {
        logger::error("Refusing to save settings larger than {} bytes: {}", kMaxSettingsFileBytes, jsonLen);
        return false;
    }

    auto tempPath = settingsPath;
    tempPath += ".tmp";

    {
        std::ofstream file(tempPath, std::ios::binary | std::ios::trunc);
        if (!file.is_open()) {
            logger::error("Failed to open temp settings file for write: {}", tempPath.string());
            return false;
        }

        file.write(jsonData.data(), static_cast<std::streamsize>(jsonLen));
        file.flush();
        if (!file.good()) {
            logger::error("Failed to write temp settings file: {}", tempPath.string());
            return false;
        }
    }

    if (!ReplaceFileWithRollback(tempPath, settingsPath, "settings")) {
        return false;
    }

    logger::info("Settings saved");
    return true;
}

void RunAsyncSettingsWriter(std::stop_token stopToken)
{
    std::unique_lock lock(g_asyncSettingsMutex);
    while (true) {
        g_asyncSettingsCv.wait(lock, stopToken, []() { return g_pendingSettingsWrite.has_value(); });

        if (!g_pendingSettingsWrite.has_value()) {
            if (stopToken.stop_requested()) break;
            continue;
        }

        auto write = std::move(*g_pendingSettingsWrite);
        g_pendingSettingsWrite.reset();
        lock.unlock();

        if (!SaveSettingsSync(write.gameRootPath, write.jsonData)) {
            logger::warn("Async settings save failed");
        }

        lock.lock();
        if (stopToken.stop_requested() && !g_pendingSettingsWrite.has_value()) {
            break;
        }
    }
}

void EnsureAsyncSettingsWriterStarted()
{
    if (g_asyncSettingsWriterStarted.exchange(true)) return;

    g_asyncSettingsWriter = std::jthread([](std::stop_token stopToken) {
        RunAsyncSettingsWriter(stopToken);
    });
}

}  // namespace

std::filesystem::path GetSettingsDirectoryPath(const std::filesystem::path& gameRootPath)
{
    return gameRootPath / "Data" / "SKSE" / "Plugins";
}

std::filesystem::path GetSettingsPath(const std::filesystem::path& gameRootPath)
{
    return GetSettingsDirectoryPath(gameRootPath) / "TulliusWidgets.json";
}

std::filesystem::path GetPresetPath(const std::filesystem::path& gameRootPath)
{
    return GetSettingsDirectoryPath(gameRootPath) / "TulliusWidgets_preset.json";
}

bool SaveSettings(const std::filesystem::path& gameRootPath, std::string_view jsonData)
{
    return SaveSettingsSync(gameRootPath, jsonData);
}

bool SaveSettingsAsync(const std::filesystem::path& gameRootPath, std::string_view jsonData)
{
    if (jsonData.size() > kMaxSettingsFileBytes) {
        logger::error("Refusing to queue settings larger than {} bytes: {}", kMaxSettingsFileBytes, jsonData.size());
        return false;
    }

    EnsureAsyncSettingsWriterStarted();
    {
        std::scoped_lock lock(g_asyncSettingsMutex);
        g_pendingSettingsWrite = PendingSettingsWrite{ gameRootPath, std::string(jsonData) };
    }
    g_asyncSettingsCv.notify_one();
    return true;
}

std::string LoadSettings(const std::filesystem::path& gameRootPath)
{
    std::string out;
    if (!ReadTextFileWithLimit(GetSettingsPath(gameRootPath), kMaxSettingsFileBytes, "Settings", out)) return "";
    return out;
}

bool ExportPreset(const std::filesystem::path& gameRootPath, std::string_view jsonData)
{
    if (!EnsureSettingsDirectory(gameRootPath)) return false;

    const auto presetPath = GetPresetPath(gameRootPath);
    auto tempPath = presetPath;
    tempPath += ".tmp";

    {
        std::ofstream file(tempPath, std::ios::binary | std::ios::trunc);
        if (!file.is_open()) {
            logger::error("Failed to open temp preset file for write: {}", tempPath.string());
            return false;
        }

        file.write(jsonData.data(), static_cast<std::streamsize>(jsonData.size()));
        file.flush();
        if (!file.good()) {
            logger::error("Preset export write failed: {}", tempPath.string());
            return false;
        }
    }

    if (!ReplaceFileWithRollback(tempPath, presetPath, "preset")) {
        return false;
    }

    logger::info("Preset exported");
    return true;
}

bool LoadPreset(const std::filesystem::path& gameRootPath, std::string& outJson)
{
    return ReadTextFileWithLimit(GetPresetPath(gameRootPath), kMaxSettingsFileBytes, "Preset", outJson);
}

}  // namespace TulliusWidgets::NativeStorage

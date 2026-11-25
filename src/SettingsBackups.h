#pragma once

// Keeps the player's settings file from being lost when the view saves over it without having
// taken it in first. That happened once in game (2026-11-25): the view started from defaults
// although the plugin had sent it the saved file, and its saves replaced the file, so the
// player's layout slots and choices were gone. The cause was never found, so these copies guard
// against it whatever it was.
//
// Two copies, both next to the settings file:
// - "<file>.prev": the file as it was before the first save of each game session.
// - "<file>.unloaded-<stamp>.bak": the file as it was before a save that does not follow on from
//   it. Each save says which saved file the view took in ("loadedFile", and its "loadedRev"). A
//   save follows on from the file on disk when the view took in that very revision, or when the
//   plugin wrote that revision itself earlier this session. Anything else (the view took in no
//   file, or another revision, or the file is damaged) is kept before it is replaced.
// A save whose required copy cannot be made, or whose file cannot even be checked, is refused, so
// the file stays as it is rather than being replaced unprotected.
//
// Standard library only, so the native tests can build it with the host compiler.

#include "JsonUtils.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <exception>
#include <filesystem>
#include <fstream>
#include <optional>
#include <string>
#include <string_view>
#include <system_error>
#include <thread>
#include <vector>

namespace TulliusWidgets::SettingsBackups {

inline constexpr std::size_t kUnloadedBackupsKept = 5;
inline constexpr std::string_view kPreviousSuffix = ".prev";
inline constexpr std::string_view kUnloadedInfix = ".unloaded-";
inline constexpr std::string_view kUnloadedSuffix = ".bak";

/** What a save says about the saved file its view took in. */
struct LoadedFile {
    /** The save carries the fields at all (views before this change do not). */
    bool reported = false;
    /** The view took in a saved file this session. */
    bool taken = false;
    /** That file's revision, when it had one. */
    std::optional<std::uint32_t> revision;
};

inline LoadedFile ReadLoadedFile(std::string_view incomingJson)
{
    LoadedFile loaded;
    const auto taken = JsonUtils::detail::FindMemberToken(incomingJson, { "loadedFile" });
    if (!taken) return loaded;
    loaded.reported = true;
    loaded.taken = *taken == "true";
    loaded.revision = JsonUtils::TryReadUIntMember(incomingJson, { "loadedRev" });
    return loaded;
}

/**
 * True when a save would replace a file the view never took in. `existingRevision` is the file's
 * revision when it has a readable one; `lastWrittenRevision` the revision this plugin last wrote.
 */
inline bool IsUnloadedReplacement(
    std::optional<std::uint32_t> existingRevision,
    bool existingPredatesRevisions,
    const LoadedFile& loaded,
    std::optional<std::uint32_t> incomingRevision,
    std::optional<std::uint32_t> lastWrittenRevision)
{
    if (!loaded.reported) {
        // A view that does not say what it took in: fall back to comparing revisions. Every save
        // is one higher than the last, so one that is not above the file's own did not follow it.
        if (!incomingRevision.has_value()) return false;
        if (!existingRevision.has_value()) return true;
        return *existingRevision >= *incomingRevision;
    }
    if (existingRevision.has_value()) {
        if (lastWrittenRevision == existingRevision) return false;
        return !(loaded.taken && loaded.revision == existingRevision);
    }
    // No readable revision: valid settings from before revisions were saved follow on when the
    // view took a file in; a damaged file never does.
    return !(existingPredatesRevisions && loaded.taken);
}

inline std::filesystem::path PreviousCopyPath(const std::filesystem::path& settingsPath)
{
    auto path = settingsPath;
    path += std::string(kPreviousSuffix);
    return path;
}

/** `stamp` is a sortable local time such as 20261125-133800. */
inline std::filesystem::path UnloadedBackupPath(const std::filesystem::path& settingsPath, std::string_view stamp)
{
    auto path = settingsPath;
    path += std::string(kUnloadedInfix);
    path += std::string(stamp);
    path += std::string(kUnloadedSuffix);
    return path;
}

struct PrepareResult {
    /** The settings file existed. */
    bool hadExistingFile = false;
    std::optional<std::uint32_t> existingRevision;
    std::optional<std::uint32_t> incomingRevision;
    /** The existing file is valid settings from before revisions were saved. */
    bool existingPredatesRevisions = false;
    bool previousCopied = false;
    /** Set when the file was kept before this save replaces it. */
    std::optional<std::filesystem::path> unloadedBackup;
    /** The view did take the file in; the copy is only a precaution, nothing to tell the player. */
    bool unloadedBackupIsPrecaution = false;
    /**
     * The file must not be replaced by this save: it could not be checked, or the copy it needed
     * could not be made. `refusal` says why.
     */
    bool mustNotReplace = false;
    std::string refusal;
    /** Problems that did not stop the save. */
    std::vector<std::string> errors;
};

namespace detail {

enum class ReadOutcome {
    Read,
    /** Empty or over the size limit: the plugin would not have sent it to the view either. */
    NotSendable,
    /** Could not be sized, opened or read in full, as when another program holds it. */
    Unavailable,
};

inline ReadOutcome ReadWholeFileOnce(const std::filesystem::path& path, std::uintmax_t maxBytes, std::string& out)
{
    std::error_code ec;
    const auto size = std::filesystem::file_size(path, ec);
    if (ec) return ReadOutcome::Unavailable;
    if (size == 0 || size > maxBytes) return ReadOutcome::NotSendable;
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) return ReadOutcome::Unavailable;
    out.assign(static_cast<std::size_t>(size), '\0');
    file.read(out.data(), static_cast<std::streamsize>(size));
    if (file.gcount() != static_cast<std::streamsize>(size)) return ReadOutcome::Unavailable;
    return ReadOutcome::Read;
}

inline ReadOutcome ReadWholeFile(const std::filesystem::path& path, std::uintmax_t maxBytes, std::string& out)
{
    constexpr auto kRetryDelay = std::chrono::milliseconds(50);
    auto outcome = ReadWholeFileOnce(path, maxBytes, out);
    if (outcome == ReadOutcome::Unavailable) {
        std::this_thread::sleep_for(kRetryDelay);
        outcome = ReadWholeFileOnce(path, maxBytes, out);
    }
    return outcome;
}

inline bool CopyOver(const std::filesystem::path& from, const std::filesystem::path& to, std::string& error)
{
    std::error_code ec;
    std::filesystem::copy_file(from, to, std::filesystem::copy_options::overwrite_existing, ec);
    if (ec) {
        error = "copy '" + from.string() + "' to '" + to.string() + "': " + ec.message();
        return false;
    }
    return true;
}

inline bool IsDigits(std::string_view text)
{
    return !text.empty()
        && std::all_of(text.begin(), text.end(), [](char c) { return std::isdigit(static_cast<unsigned char>(c)) != 0; });
}

// "<8 digits>-<6 digits>" with an optional "_<2 digits>" counter: only names this code makes.
inline bool IsBackupStamp(std::string_view stamp)
{
    if (stamp.size() == 18) {
        if (stamp[15] != '_' || !IsDigits(stamp.substr(16, 2))) return false;
        stamp = stamp.substr(0, 15);
    }
    return stamp.size() == 15 && stamp[8] == '-' && IsDigits(stamp.substr(0, 8)) && IsDigits(stamp.substr(9, 6));
}

// A second backup in the same second gets a counter so it does not replace the first. "_02"
// sorts after the bare stamp's ".bak" and before "_10", so names stay in creation order. Empty
// when every name is taken or the folder cannot be checked.
inline std::optional<std::filesystem::path> FreeUnloadedBackupPath(const std::filesystem::path& settingsPath, std::string_view stamp)
{
    for (int counter = 1; counter < 100; ++counter) {
        const std::string suffix = counter == 1 ? std::string() : (counter < 10 ? "_0" : "_") + std::to_string(counter);
        const auto candidate = UnloadedBackupPath(settingsPath, std::string(stamp) + suffix);
        std::error_code ec;
        const bool taken = std::filesystem::exists(candidate, ec);
        if (ec) return std::nullopt;
        if (!taken) return candidate;
    }
    return std::nullopt;
}

}  // namespace detail

/** Unloaded backups of `settingsPath` this code made, oldest first (the stamp sorts by time). */
inline std::vector<std::filesystem::path> ListUnloadedBackups(const std::filesystem::path& settingsPath, std::vector<std::string>& errors)
{
    std::vector<std::filesystem::path> backups;
    const auto folder = settingsPath.parent_path();
    const auto prefix = settingsPath.filename().string() + std::string(kUnloadedInfix);
    std::error_code ec;
    std::filesystem::directory_iterator it(folder, ec);
    if (ec) {
        errors.push_back("list '" + folder.string() + "': " + ec.message());
        return backups;
    }
    // Stepped with error codes: a folder that changes under the walk must not throw on the
    // settings writer thread.
    for (const std::filesystem::directory_iterator end; it != end; it.increment(ec)) {
        if (ec) {
            errors.push_back("list '" + folder.string() + "': " + ec.message());
            break;
        }
        std::error_code entryEc;
        if (!it->is_regular_file(entryEc)) continue;
        std::string name;
        try {
            name = it->path().filename().string();
        } catch (const std::exception&) {
            continue;  // A name that does not convert is not one of ours.
        }
        if (name.size() <= prefix.size() + kUnloadedSuffix.size()
            || name.compare(0, prefix.size(), prefix) != 0
            || name.compare(name.size() - kUnloadedSuffix.size(), kUnloadedSuffix.size(), kUnloadedSuffix) != 0) {
            continue;
        }
        const auto stamp = std::string_view(name).substr(prefix.size(), name.size() - prefix.size() - kUnloadedSuffix.size());
        if (detail::IsBackupStamp(stamp)) backups.push_back(it->path());
    }
    std::sort(backups.begin(), backups.end(), [](const auto& left, const auto& right) {
        return left.filename().native() < right.filename().native();
    });
    return backups;
}

/**
 * Removes the oldest unloaded backups beyond `keep`, never `justMade`: if the clock went back, the
 * copy just taken could sort as the oldest, and it is the one that matters most.
 */
inline void PruneUnloadedBackups(
    const std::filesystem::path& settingsPath,
    std::size_t keep,
    const std::filesystem::path& justMade,
    std::vector<std::string>& errors)
{
    const auto backups = ListUnloadedBackups(settingsPath, errors);
    if (backups.size() <= keep) return;
    auto excess = backups.size() - keep;
    for (const auto& backup : backups) {
        if (excess == 0) break;
        if (backup.filename() == justMade.filename()) continue;
        std::error_code ec;
        if (std::filesystem::remove(backup, ec)) {
            --excess;
        } else if (ec) {
            errors.push_back("remove '" + backup.string() + "': " + ec.message());
        }
    }
}

/**
 * Makes the copies due before `incomingJson` replaces the file at `settingsPath`, and says
 * whether it may be replaced. Call it before every save; `firstSaveThisSession` asks for the
 * ".prev" copy.
 */
inline PrepareResult PrepareForSave(
    const std::filesystem::path& settingsPath,
    std::string_view incomingJson,
    bool firstSaveThisSession,
    std::string_view stamp,
    std::uintmax_t maxBytes,
    std::optional<std::uint32_t> lastWrittenRevision)
{
    PrepareResult result;
    result.incomingRevision = JsonUtils::TryReadUIntMember(incomingJson, { "rev" });

    std::error_code ec;
    const bool exists = std::filesystem::exists(settingsPath, ec);
    if (ec) {
        result.mustNotReplace = true;
        result.refusal = "could not check '" + settingsPath.string() + "': " + ec.message();
        return result;
    }
    if (!exists) return result;
    result.hadExistingFile = true;

    std::string existing;
    const auto readOutcome = detail::ReadWholeFile(settingsPath, maxBytes, existing);
    if (readOutcome == detail::ReadOutcome::Unavailable) {
        result.mustNotReplace = true;
        result.refusal = "could not read '" + settingsPath.string() + "' to check it before saving";
        return result;
    }
    if (readOutcome == detail::ReadOutcome::Read) {
        result.existingRevision = JsonUtils::TryReadUIntMember(existing, { "rev" });
        const auto general = JsonUtils::detail::FindMemberToken(existing, { "general" });
        result.existingPredatesRevisions = !JsonUtils::detail::FindMemberToken(existing, { "rev" }).has_value()
            && general.has_value() && !general->empty() && general->front() == '{';
    }

    if (firstSaveThisSession) {
        std::string error;
        result.previousCopied = detail::CopyOver(settingsPath, PreviousCopyPath(settingsPath), error);
        if (!result.previousCopied) result.errors.push_back(error);
    }

    const auto loaded = ReadLoadedFile(incomingJson);
    const bool unloaded = IsUnloadedReplacement(
        result.existingRevision, result.existingPredatesRevisions, loaded, result.incomingRevision, lastWrittenRevision);
    // A valid file from before revisions that the view did take in gets a copy too, as a
    // precaution for the first save in the new format.
    const bool precaution = !unloaded && result.existingPredatesRevisions;
    if (!unloaded && !precaution) return result;

    const auto backupPath = detail::FreeUnloadedBackupPath(settingsPath, stamp);
    std::string error;
    if (!backupPath) {
        error = "no free backup name next to '" + settingsPath.string() + "'";
    } else if (detail::CopyOver(settingsPath, *backupPath, error)) {
        result.unloadedBackup = *backupPath;
        result.unloadedBackupIsPrecaution = precaution;
        PruneUnloadedBackups(settingsPath, kUnloadedBackupsKept, *backupPath, result.errors);
        return result;
    }
    if (unloaded) {
        result.mustNotReplace = true;
        result.refusal = "could not keep the settings file before replacing it: " + error;
    } else {
        result.errors.push_back(error);
    }
    return result;
}

/** The script that shows the backup notice in the view, with the file name as a JS string. */
inline std::string BuildBackupNoticeScript(std::string_view functionName, std::string_view fileName)
{
    return std::string(functionName) + "(\"" + JsonUtils::Escape(fileName) + "\")";
}

/** `text` cut to at most `maxBytes` without splitting a UTF-8 character. */
inline std::string_view ClampUtf8(std::string_view text, std::size_t maxBytes)
{
    if (text.size() <= maxBytes) return text;
    std::size_t end = maxBytes;
    while (end > 0 && (static_cast<unsigned char>(text[end]) & 0xC0) == 0x80) --end;
    return text.substr(0, end);
}

/** `text` without a leading UTF-8 byte order mark, which JSON.parse in the view rejects. */
inline std::string_view StripUtf8Bom(std::string_view text)
{
    constexpr std::string_view kBom = "\xEF\xBB\xBF";
    return text.substr(0, kBom.size()) == kBom ? text.substr(kBom.size()) : text;
}

}  // namespace TulliusWidgets::SettingsBackups

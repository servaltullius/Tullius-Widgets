// Behavioral test for src/SettingsBackups.h. Built and run by
// scripts/settings-backups.native.test.mjs with the host C++ compiler, in a temporary folder.

#include "SettingsBackups.h"

#include <chrono>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <iterator>
#include <optional>
#include <string>
#include <vector>

namespace fs = std::filesystem;
using namespace TulliusWidgets::SettingsBackups;

namespace {

int g_failures = 0;

void Check(bool condition, const char* expression, int line)
{
    if (!condition) {
        std::fprintf(stderr, "FAILED line %d: %s\n", line, expression);
        ++g_failures;
    }
}

#define CHECK(expr) Check((expr), #expr, __LINE__)

constexpr std::uintmax_t kMaxBytes = 256 * 1024;
constexpr auto kNoneWritten = std::nullopt;

void Write(const fs::path& path, const std::string& text)
{
    std::ofstream file(path, std::ios::binary | std::ios::trunc);
    file << text;
}

std::string Read(const fs::path& path)
{
    std::ifstream file(path, std::ios::binary);
    return std::string(std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>());
}

fs::path FreshFolder(const fs::path& root, const char* name)
{
    const auto folder = root / name;
    fs::remove_all(folder);
    fs::create_directories(folder);
    return folder;
}

// A save from a view that took in the saved file with `loadedRev` (or none).
std::string Save(int rev, bool loadedFile, std::optional<int> loadedRev)
{
    return "{\"general\":{},\"rev\":" + std::to_string(rev)
        + ",\"loadedFile\":" + (loadedFile ? "true" : "false")
        + ",\"loadedRev\":" + (loadedRev ? std::to_string(*loadedRev) : std::string("null")) + "}";
}

PrepareResult Prepare(const fs::path& settings, const std::string& save, const char* stamp = "20261125-133800",
    std::optional<std::uint32_t> lastWritten = std::nullopt, bool first = false)
{
    return PrepareForSave(settings, save, first, stamp, kMaxBytes, lastWritten);
}

std::size_t CountBackups(const fs::path& settings)
{
    std::vector<std::string> errors;
    return ListUnloadedBackups(settings, errors).size();
}

void TestFollowOnRule()
{
    const LoadedFile took40{ true, true, 40 };
    const LoadedFile tookNothing{ true, false, std::nullopt };
    const LoadedFile tookLegacy{ true, true, std::nullopt };
    const LoadedFile oldView{};

    // The view took in this very revision, or the plugin wrote it itself.
    CHECK(!IsUnloadedReplacement(40, false, took40, 41, kNoneWritten));
    CHECK(!IsUnloadedReplacement(41, false, took40, 42, 41));
    // Two edits merged into one save (revision jumps) still follow on.
    CHECK(!IsUnloadedReplacement(40, false, took40, 43, kNoneWritten));
    // The view took in nothing, or another revision: whatever the save's own number.
    CHECK(IsUnloadedReplacement(1, false, tookNothing, 2, kNoneWritten));
    CHECK(IsUnloadedReplacement(40, false, tookNothing, 41, kNoneWritten));
    CHECK(IsUnloadedReplacement(40, false, LoadedFile{ true, true, 39 }, 41, kNoneWritten));
    // No readable revision: a legacy file the view took in follows on; a damaged one never does.
    CHECK(!IsUnloadedReplacement(std::nullopt, true, tookLegacy, 1, kNoneWritten));
    CHECK(IsUnloadedReplacement(std::nullopt, true, tookNothing, 1, kNoneWritten));
    CHECK(IsUnloadedReplacement(std::nullopt, false, tookLegacy, 1, kNoneWritten));
    // A view that does not report what it took in falls back to comparing revisions.
    CHECK(!IsUnloadedReplacement(40, false, oldView, 41, kNoneWritten));
    CHECK(IsUnloadedReplacement(40, false, oldView, 40, kNoneWritten));
    CHECK(IsUnloadedReplacement(std::nullopt, false, oldView, 1, kNoneWritten));
    CHECK(!IsUnloadedReplacement(40, false, oldView, std::nullopt, kNoneWritten));

    const auto parsed = ReadLoadedFile(Save(3, true, 40));
    CHECK(parsed.reported && parsed.taken && parsed.revision == 40u);
    const auto none = ReadLoadedFile(Save(3, false, std::nullopt));
    CHECK(none.reported && !none.taken && !none.revision.has_value());
    CHECK(!ReadLoadedFile(R"({"rev":3})").reported);
}

void TestNoFileDoesNothing(const fs::path& root)
{
    const auto folder = FreshFolder(root, "none");
    const auto settings = folder / "TulliusWidgets.json";
    const auto result = Prepare(settings, Save(1, false, std::nullopt), "20261125-133800", std::nullopt, true);
    CHECK(!result.hadExistingFile);
    CHECK(!result.previousCopied);
    CHECK(!result.unloadedBackup.has_value());
    CHECK(!result.mustNotReplace);
    CHECK(result.errors.empty());
}

void TestFollowOnSaveKeepsOnlyTheSessionCopy(const fs::path& root)
{
    const auto folder = FreshFolder(root, "follow-on");
    const auto settings = folder / "TulliusWidgets.json";
    const std::string original = R"({"general":{"iconTheme":"dororong"},"rev":40})";
    Write(settings, original);

    const auto first = Prepare(settings, Save(43, true, 40), "20261125-133800", std::nullopt, true);
    CHECK(first.existingRevision == 40u);
    CHECK(first.previousCopied);
    CHECK(Read(PreviousCopyPath(settings)) == original);
    CHECK(!first.unloadedBackup.has_value());
    CHECK(!first.mustNotReplace);
    CHECK(CountBackups(settings) == 0);
}

void TestSaveThatDoesNotFollowOnKeepsTheFile(const fs::path& root)
{
    const auto folder = FreshFolder(root, "unloaded");
    const auto settings = folder / "TulliusWidgets.json";
    const std::string original = R"({"general":{"iconTheme":"dororong"},"layoutSlots":[{"savedAt":1}],"rev":1})";
    Write(settings, original);

    // The view took nothing in and two quick edits went out as one save with revision 2.
    const auto result = Prepare(settings, Save(2, false, std::nullopt));
    CHECK(result.unloadedBackup.has_value());
    CHECK(!result.unloadedBackupIsPrecaution);
    CHECK(!result.mustNotReplace);
    CHECK(result.unloadedBackup && result.unloadedBackup->filename() == "TulliusWidgets.json.unloaded-20261125-133800.bak");
    CHECK(result.unloadedBackup && Read(*result.unloadedBackup) == original);

    // The same second again gets its own name, in creation order.
    const auto again = Prepare(settings, Save(3, false, std::nullopt));
    CHECK(again.unloadedBackup && again.unloadedBackup->filename() == "TulliusWidgets.json.unloaded-20261125-133800_02.bak");
    std::vector<std::string> errors;
    const auto listed = ListUnloadedBackups(settings, errors);
    CHECK(listed.size() == 2);
    CHECK(listed.size() == 2 && listed[0].filename() == "TulliusWidgets.json.unloaded-20261125-133800.bak");
    CHECK(listed.size() == 2 && listed[1].filename() == "TulliusWidgets.json.unloaded-20261125-133800_02.bak");

    // Once the plugin has written a revision itself, the next save follows on from it.
    Write(settings, R"({"rev":2})");
    const auto own = Prepare(settings, Save(3, false, std::nullopt), "20261125-133801", 2u);
    CHECK(!own.unloadedBackup.has_value());
}

void TestDamagedAndLegacyFiles(const fs::path& root)
{
    const auto folder = FreshFolder(root, "unreadable");
    const auto settings = folder / "TulliusWidgets.json";
    const std::string damaged = "{\"general\":{\"iconTheme\":\"doro";
    Write(settings, damaged);
    const auto broken = Prepare(settings, Save(1, false, std::nullopt), "20261125-133800", std::nullopt, true);
    CHECK(!broken.existingRevision.has_value());
    CHECK(!broken.existingPredatesRevisions);
    CHECK(broken.previousCopied);
    CHECK(broken.unloadedBackup && Read(*broken.unloadedBackup) == damaged);
    CHECK(!broken.unloadedBackupIsPrecaution);

    const auto legacyFolder = FreshFolder(root, "legacy");
    const auto legacySettings = legacyFolder / "TulliusWidgets.json";
    const std::string legacy = R"({"general":{"iconTheme":"dororong"},"schemaVersion":3})";
    Write(legacySettings, legacy);
    const auto taken = Prepare(legacySettings, Save(1, true, std::nullopt));
    CHECK(taken.existingPredatesRevisions);
    CHECK(taken.unloadedBackup && Read(*taken.unloadedBackup) == legacy);
    CHECK(taken.unloadedBackupIsPrecaution);
    const auto missed = Prepare(legacySettings, Save(1, false, std::nullopt), "20261125-133801");
    CHECK(missed.unloadedBackup.has_value() && !missed.unloadedBackupIsPrecaution);
    // A rev member that is there but not a number is damage, not an old format.
    Write(legacySettings, R"({"general":{},"rev":"x"})");
    CHECK(!Prepare(legacySettings, Save(1, true, std::nullopt), "20261125-133802").existingPredatesRevisions);
}

void TestOnlyTheNewestBackupsStay(const fs::path& root)
{
    const auto folder = FreshFolder(root, "prune");
    const auto settings = folder / "TulliusWidgets.json";
    Write(settings, R"({"rev":40})");
    // Unrelated files next to it, including a hand-made backup, are never touched.
    Write(folder / "TulliusWidgets_preset.json", "{}");
    Write(folder / "TulliusWidgets.json.unloaded-notes.txt", "keep");
    Write(folder / "TulliusWidgets.json.unloaded-000-mine.bak", "keep");

    for (int i = 1; i <= 7; ++i) {
        const std::string stamp = "2026112" + std::to_string(i) + "-120000";
        (void)Prepare(settings, Save(1, false, std::nullopt), stamp.c_str());
    }

    std::vector<std::string> errors;
    const auto backups = ListUnloadedBackups(settings, errors);
    CHECK(backups.size() == kUnloadedBackupsKept);
    CHECK(!backups.empty() && backups.front().filename() == "TulliusWidgets.json.unloaded-20261123-120000.bak");
    CHECK(!backups.empty() && backups.back().filename() == "TulliusWidgets.json.unloaded-20261127-120000.bak");
    CHECK(fs::exists(folder / "TulliusWidgets_preset.json"));
    CHECK(fs::exists(folder / "TulliusWidgets.json.unloaded-notes.txt"));
    CHECK(fs::exists(folder / "TulliusWidgets.json.unloaded-000-mine.bak"));

    // The clock now reads earlier than every existing backup: the new copy still stays.
    const auto result = Prepare(settings, Save(1, false, std::nullopt), "20250101-000000");
    CHECK(result.unloadedBackup && fs::exists(*result.unloadedBackup));
    CHECK(CountBackups(settings) == kUnloadedBackupsKept);
}

void TestFilesThatCannotBeCheckedOrKeptAreNotReplaced(const fs::path& root)
{
    const auto folder = FreshFolder(root, "locked");
    const auto settings = folder / "TulliusWidgets.json";
    Write(settings, R"({"rev":40})");
    fs::permissions(settings, fs::perms::none);
    std::ifstream probe(settings, std::ios::binary);
    const bool locked = !probe.is_open();
    probe.close();
    // Root (or a file system that ignores the bits) can still open it; then there is nothing to check.
    if (locked) {
        const auto result = Prepare(settings, Save(41, true, 40));
        CHECK(result.mustNotReplace);
        CHECK(!result.refusal.empty());
        CHECK(!result.unloadedBackup.has_value());
    }
    fs::permissions(settings, fs::perms::owner_read | fs::perms::owner_write);

    // The copy a non-following save needs cannot be made: the folder is read-only.
    const auto readOnly = FreshFolder(root, "read-only");
    const auto readOnlySettings = readOnly / "TulliusWidgets.json";
    Write(readOnlySettings, R"({"rev":40})");
    fs::permissions(readOnly, fs::perms::owner_read | fs::perms::owner_exec);
    std::ofstream writeProbe(readOnly / "probe");
    const bool folderLocked = !writeProbe.is_open();
    writeProbe.close();
    if (folderLocked) {
        const auto refused = Prepare(readOnlySettings, Save(1, false, std::nullopt));
        CHECK(refused.mustNotReplace);
        // A save that follows on is not held up by a copy it does not need.
        const auto followOn = Prepare(readOnlySettings, Save(41, true, 40));
        CHECK(!followOn.mustNotReplace);
    }
    fs::permissions(readOnly, fs::perms::owner_all);
}

void TestNoticeScriptAndText()
{
    CHECK(BuildBackupNoticeScript("showSettingsBackupNotice", "TulliusWidgets.json.unloaded-20261125-133800.bak")
        == "showSettingsBackupNotice(\"TulliusWidgets.json.unloaded-20261125-133800.bak\")");
    CHECK(BuildBackupNoticeScript("f", "a\"b\\c") == "f(\"a\\\"b\\\\c\")");

    CHECK(ClampUtf8("short", 10) == "short");
    CHECK(ClampUtf8("abcdef", 3) == "abc");
    // "가" is three bytes; cutting inside it backs off to before it.
    const std::string korean = "ab" "\xEA\xB0\x80" "cd";
    CHECK(ClampUtf8(korean, 3) == "ab");
    CHECK(ClampUtf8(korean, 4) == "ab");
    CHECK(ClampUtf8(korean, 5) == "ab" "\xEA\xB0\x80");

    CHECK(StripUtf8Bom("\xEF\xBB\xBF{\"rev\":1}") == "{\"rev\":1}");
    CHECK(StripUtf8Bom("{\"rev\":1}") == "{\"rev\":1}");
}

}  // namespace

int main()
{
    const auto stamp = std::chrono::steady_clock::now().time_since_epoch().count();
    const auto root = fs::temp_directory_path() / ("tw-settings-backups-" + std::to_string(stamp));
    fs::create_directories(root);

    TestFollowOnRule();
    TestNoFileDoesNothing(root);
    TestFollowOnSaveKeepsOnlyTheSessionCopy(root);
    TestSaveThatDoesNotFollowOnKeepsTheFile(root);
    TestDamagedAndLegacyFiles(root);
    TestOnlyTheNewestBackupsStay(root);
    TestFilesThatCannotBeCheckedOrKeptAreNotReplaced(root);
    TestNoticeScriptAndText();

    std::error_code ec;
    fs::remove_all(root, ec);

    if (g_failures != 0) {
        std::fprintf(stderr, "settings_backups_test: %d failure(s)\n", g_failures);
        return 1;
    }
    std::printf("settings_backups_test: ok\n");
    return 0;
}

// Behavioral test for src/SelfTestSession.h. Built and run by
// scripts/self-test-session.native.test.mjs with the host C++ compiler, in a temporary folder.

#include "SelfTestSession.h"

#include <chrono>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <iterator>
#include <string>

namespace fs = std::filesystem;
using namespace TulliusWidgets::SelfTestSession;

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

void TestOnlyASureMarkerStartsASession(const fs::path& root)
{
    const auto plugins = FreshFolder(root, "plugins");
    CHECK(CheckMarker(plugins) == MarkerState::kAbsent);

    Write(plugins / "TulliusWidgets.selftest", "");
    CHECK(CheckMarker(plugins) == MarkerState::kPresent);

    // A folder of that name is not the marker.
    const auto other = FreshFolder(root, "plugins-with-folder");
    fs::create_directories(other / "TulliusWidgets.selftest");
    CHECK(CheckMarker(other) == MarkerState::kAbsent);

    // A plugins folder that is not there at all: nothing to find, so the normal mode.
    CHECK(CheckMarker(root / "missing") == MarkerState::kAbsent);

    CHECK(StartsSession(MarkerState::kPresent));
    CHECK(!StartsSession(MarkerState::kAbsent));
    CHECK(!StartsSession(MarkerState::kUnknown));

    CHECK(!IsActive());
    SetActiveForLaunch(true);
    CHECK(IsActive());
    SetActiveForLaunch(false);
    CHECK(!IsActive());
}

void TestTheRunStartsOnceTheGameSettled()
{
    using namespace std::chrono_literals;
    using Action = RunTrigger::Action;
    const auto t0 = RunTrigger::Clock::time_point{} + 100s;

    RunTrigger trigger;
    // Nothing before a game is loaded, before it settled, or while the view is not shown.
    CHECK(trigger.Poll(t0, true) == Action::kNone);
    trigger.NoteGameLoaded(t0);
    CHECK(trigger.Poll(t0 + 2s, true) == Action::kNone);
    CHECK(trigger.Poll(t0 + 3s, false) == Action::kNone);
    CHECK(trigger.Poll(t0 + 3s, true) == Action::kInvoke);
    CHECK(trigger.Attempts() == 1);
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kInvoked);

    // Waits for the page to say it started; loading another save does not restart the wait.
    trigger.NoteGameLoaded(t0 + 5s);
    CHECK(trigger.Poll(t0 + 12s, true) == Action::kNone);
    trigger.NoteStarted();
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kStarted);
    CHECK(trigger.Poll(t0 + 60s, true) == Action::kNone);
    trigger.NoteFinished();
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kFinished);
    CHECK(trigger.Poll(t0 + 600s, true) == Action::kNone);
}

void TestAPageThatNeverStartsIsAskedAgainThenGivenUp()
{
    using namespace std::chrono_literals;
    using Action = RunTrigger::Action;
    const auto t0 = RunTrigger::Clock::time_point{} + 100s;

    RunTrigger trigger;
    trigger.NoteGameLoaded(t0);
    CHECK(trigger.Poll(t0 + 3s, true) == Action::kInvoke);
    CHECK(trigger.Poll(t0 + 13s, false) == Action::kNone);  // asks again only while shown
    CHECK(trigger.Poll(t0 + 14s, true) == Action::kInvoke);
    CHECK(trigger.Attempts() == 2);
    CHECK(trigger.Poll(t0 + 24s, true) == Action::kInvoke);
    CHECK(trigger.Attempts() == 3);
    CHECK(trigger.Poll(t0 + 34s, true) == Action::kGiveUp);
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kGaveUp);
    // Gives up once; a late start or finish does not turn the session around.
    CHECK(trigger.Poll(t0 + 100s, true) == Action::kNone);
    trigger.NoteFinished();
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kGaveUp);
}

void TestAnyReportOfARunningPageStopsTheRequests()
{
    using namespace std::chrono_literals;
    using Action = RunTrigger::Action;
    const auto t0 = RunTrigger::Clock::time_point{} + 100s;

    // The "started" report was lost; the page answers the repeated request with its last report.
    RunTrigger trigger;
    trigger.NoteGameLoaded(t0);
    CHECK(trigger.Poll(t0 + 3s, true) == Action::kInvoke);
    CHECK(trigger.Poll(t0 + 13s, true) == Action::kInvoke);
    trigger.NoteReport("running");
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kStarted);
    CHECK(trigger.Poll(t0 + 60s, true) == Action::kNone);
    trigger.NoteReport("finished");
    CHECK(trigger.GetPhase() == RunTrigger::Phase::kFinished);

    // A status the plugin does not know changes nothing.
    RunTrigger other;
    other.NoteGameLoaded(t0);
    CHECK(other.Poll(t0 + 3s, true) == Action::kInvoke);
    other.NoteReport("");
    other.NoteReport("paused");
    CHECK(other.GetPhase() == RunTrigger::Phase::kInvoked);
    other.NoteReport("started");
    CHECK(other.GetPhase() == RunTrigger::Phase::kStarted);
}

void TestReportFactsAndTheShortReport()
{
    const std::string report =
        "{\"runId\":\"20261126-221530\",\"status\":\"finished\",\"summary\":{\"passed\":13,\"failed\":1,\"total\":14},"
        "\"results\":[{\"id\":\"a\",\"ok\":true}]}";
    const auto facts = ReadReportFacts(report);
    CHECK(facts.runId == "20261126-221530");
    CHECK(facts.status == "finished");
    CHECK(facts.passed == 13u);
    CHECK(facts.failed == 1u);
    CHECK(facts.total == 14u);

    const auto shortReport = BuildShortReport(facts, "only the \"summary\"", 2048);
    CHECK(shortReport
        == "{\"runId\":\"20261126-221530\",\"status\":\"finished\",\"note\":\"only the \\\"summary\\\"\","
           "\"originalBytes\":2048,\"summary\":{\"passed\":13,\"failed\":1,\"total\":14}}");

    // A page that never started has no counts.
    ReportFacts notStarted;
    notStarted.runId = "r";
    notStarted.status = "not-started";
    CHECK(BuildShortReport(notStarted, "never started", 0)
        == "{\"runId\":\"r\",\"status\":\"not-started\",\"note\":\"never started\",\"originalBytes\":0,"
           "\"summary\":{\"passed\":null,\"failed\":null,\"total\":null}}");
}

void TestReportsAreWrittenWholeAndOldOnesRemoved(const fs::path& root)
{
    const auto logs = root / "logs" / "SKSE";  // created on the first write
    const auto target = logs / "TulliusWidgets-selftest.json";

    const std::string first = "{\"runId\":\"r\",\"status\":\"started\",\"summary\":{\"passed\":0,\"failed\":0,\"total\":14}}";
    auto outcome = WriteReport(logs, first);
    CHECK(outcome.written);
    CHECK(!outcome.shortened);
    CHECK(Read(target) == first);
    CHECK(!fs::exists(logs / "TulliusWidgets-selftest.json.tmp"));

    // Each report replaces the one before.
    const std::string second = "{\"runId\":\"r\",\"status\":\"running\",\"summary\":{\"passed\":3,\"failed\":0,\"total\":14}}";
    outcome = WriteReport(logs, second);
    CHECK(outcome.written);
    CHECK(Read(target) == second);

    // Over the limit: the summary is kept instead of nothing.
    std::string huge = "{\"runId\":\"r\",\"status\":\"finished\",\"summary\":{\"passed\":14,\"failed\":0,\"total\":14},\"pad\":\"";
    huge.append(kMaxReportBytes, 'x');
    huge += "\"}";
    outcome = WriteReport(logs, huge);
    CHECK(outcome.written);
    CHECK(outcome.shortened);
    const auto kept = Read(target);
    CHECK(kept.size() < 1024);
    CHECK(ReadReportFacts(kept).passed == 14u);
    CHECK(ReadReportFacts(kept).status == "finished");

    CHECK(RemoveOldReport(logs));
    CHECK(!fs::exists(target));
    // Nothing there is fine too.
    CHECK(RemoveOldReport(logs));
}

}  // namespace

int main()
{
    const auto stamp = std::chrono::steady_clock::now().time_since_epoch().count();
    const auto root = fs::temp_directory_path() / ("tw-self-test-session-" + std::to_string(stamp));
    fs::create_directories(root);

    TestOnlyASureMarkerStartsASession(root);
    TestTheRunStartsOnceTheGameSettled();
    TestAPageThatNeverStartsIsAskedAgainThenGivenUp();
    TestAnyReportOfARunningPageStopsTheRequests();
    TestReportFactsAndTheShortReport();
    TestReportsAreWrittenWholeAndOldOnesRemoved(root);

    std::error_code ec;
    fs::remove_all(root, ec);

    if (g_failures != 0) {
        std::fprintf(stderr, "self_test_session_test: %d failure(s)\n", g_failures);
        return 1;
    }
    std::printf("self_test_session_test: ok\n");
    return 0;
}

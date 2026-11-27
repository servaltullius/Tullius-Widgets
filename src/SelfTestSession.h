#pragma once

// The in-game self-test (docs/plans/2026-11-26-in-game-self-test.md). A launch with the marker
// file next to the settings becomes a self-test session: nothing is saved, the real settings and
// stats never reach the view, and the view runs its scenarios once and reports them to a file.
// Standard library only, so the host-compiled native tests can check it.

#include "JsonUtils.h"

#include <atomic>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <optional>
#include <string>
#include <string_view>
#include <system_error>

namespace TulliusWidgets::SelfTestSession {

inline constexpr std::string_view kMarkerFileName = "TulliusWidgets.selftest";
inline constexpr std::string_view kReportFileName = "TulliusWidgets-selftest.json";
// A full report is a few tens of KB; anything this large is cut down to its summary.
inline constexpr std::size_t kMaxReportBytes = 1024 * 1024;

namespace detail {

inline std::atomic<bool>& ActiveFlag()
{
    static std::atomic<bool> active{ false };
    return active;
}

// The file names here are ASCII, so the narrow string converts the same under any code page.
inline std::filesystem::path FileIn(const std::filesystem::path& dir, std::string_view name)
{
    return dir / std::string(name);
}

}  // namespace detail

/** True for the whole launch once the marker was found when the plugin loaded. */
inline bool IsActive()
{
    return detail::ActiveFlag().load(std::memory_order_acquire);
}

inline void SetActiveForLaunch(bool active)
{
    detail::ActiveFlag().store(active, std::memory_order_release);
}

enum class MarkerState {
    kAbsent,
    kPresent,
    kUnknown,  // the check itself failed
};

inline MarkerState CheckMarker(const std::filesystem::path& pluginsDirectory)
{
    std::error_code ec;
    const bool exists = std::filesystem::is_regular_file(detail::FileIn(pluginsDirectory, kMarkerFileName), ec);
    if (ec) {
        // is_regular_file reports a missing file as an error code on some platforms.
        return ec == std::errc::no_such_file_or_directory ? MarkerState::kAbsent : MarkerState::kUnknown;
    }
    return exists ? MarkerState::kPresent : MarkerState::kAbsent;
}

/** Only a marker that is surely there makes a test session; a failed check keeps the normal mode. */
inline bool StartsSession(MarkerState state)
{
    return state == MarkerState::kPresent;
}

/**
 * When to ask the view to run, judged on the game thread at each visible heartbeat: a while after
 * the game loaded, then again if the view never says it started (an invoke succeeds even when the
 * page has no such function), and at last gives up so the report says it never ran.
 */
class RunTrigger {
public:
    using Clock = std::chrono::steady_clock;

    enum class Phase {
        kWaiting,
        kInvoked,
        kStarted,
        kFinished,
        kGaveUp,
    };

    enum class Action {
        kNone,
        kInvoke,
        kGiveUp,
    };

    static constexpr auto kSettleTime = std::chrono::seconds(3);
    static constexpr auto kStartTimeout = std::chrono::seconds(10);
    static constexpr int kMaxAttempts = 3;

    void NoteGameLoaded(Clock::time_point now)
    {
        if (phase_ == Phase::kWaiting) {
            loadedAt_ = now;
        }
    }

    Action Poll(Clock::time_point now, bool viewReady)
    {
        switch (phase_) {
        case Phase::kWaiting:
            if (!loadedAt_ || !viewReady || now - *loadedAt_ < kSettleTime) {
                return Action::kNone;
            }
            attempts_ = 1;
            invokedAt_ = now;
            phase_ = Phase::kInvoked;
            return Action::kInvoke;
        case Phase::kInvoked:
            if (now - invokedAt_ < kStartTimeout) {
                return Action::kNone;
            }
            if (attempts_ >= kMaxAttempts) {
                phase_ = Phase::kGaveUp;
                return Action::kGiveUp;
            }
            if (!viewReady) {
                return Action::kNone;
            }
            ++attempts_;
            invokedAt_ = now;
            return Action::kInvoke;
        default:
            return Action::kNone;
        }
    }

    void NoteStarted()
    {
        if (phase_ == Phase::kWaiting || phase_ == Phase::kInvoked) {
            phase_ = Phase::kStarted;
        }
    }

    void NoteFinished()
    {
        if (phase_ != Phase::kGaveUp) {
            phase_ = Phase::kFinished;
        }
    }

    /**
     * A report from the page. Any report but the last means the run is going: the page answers a
     * repeated request with the report it sent last, which is a "running" one once a scenario ended.
     */
    void NoteReport(std::string_view status)
    {
        if (status == "finished") {
            NoteFinished();
        } else if (status == "started" || status == "running") {
            NoteStarted();
        }
    }

    Phase GetPhase() const { return phase_; }
    int Attempts() const { return attempts_; }

private:
    Phase phase_{ Phase::kWaiting };
    std::optional<Clock::time_point> loadedAt_;
    Clock::time_point invokedAt_{};
    int attempts_{ 0 };
};

/** What the plugin reads from a report: enough to log a line and to rebuild a short report. */
struct ReportFacts {
    std::string runId;
    std::string status;
    std::optional<std::uint32_t> passed;
    std::optional<std::uint32_t> failed;
    std::optional<std::uint32_t> total;
};

inline ReportFacts ReadReportFacts(std::string_view json)
{
    ReportFacts facts;
    facts.runId = JsonUtils::TryReadStringMember(json, { "runId" }).value_or("");
    facts.status = JsonUtils::TryReadStringMember(json, { "status" }).value_or("");
    facts.passed = JsonUtils::TryReadUIntMember(json, { "summary", "passed" });
    facts.failed = JsonUtils::TryReadUIntMember(json, { "summary", "failed" });
    facts.total = JsonUtils::TryReadUIntMember(json, { "summary", "total" });
    return facts;
}

namespace detail {

inline void AppendCount(std::string& out, std::string_view name, const std::optional<std::uint32_t>& value)
{
    out += ",\"";
    out += name;
    out += "\":";
    out += value ? std::to_string(*value) : std::string("null");
}

}  // namespace detail

/**
 * A short report written by the plugin itself: when the view's report is too large to keep, or
 * when the view never started. `note` says which.
 */
inline std::string BuildShortReport(const ReportFacts& facts, std::string_view note, std::size_t originalBytes)
{
    std::string out = "{\"runId\":\"" + JsonUtils::Escape(facts.runId)
        + "\",\"status\":\"" + JsonUtils::Escape(facts.status)
        + "\",\"note\":\"" + JsonUtils::Escape(note)
        + "\",\"originalBytes\":" + std::to_string(originalBytes)
        + ",\"summary\":{";
    std::string counts;
    detail::AppendCount(counts, "passed", facts.passed);
    detail::AppendCount(counts, "failed", facts.failed);
    detail::AppendCount(counts, "total", facts.total);
    out += counts.substr(1);
    out += "}}";
    return out;
}

struct WriteOutcome {
    bool written{ false };
    bool shortened{ false };
    std::string error;
};

/**
 * Writes the report next to the plugin's log, through a temporary file so a reader never sees half
 * of it. A report over the size limit is replaced by its short form rather than lost.
 */
inline WriteOutcome WriteReport(const std::filesystem::path& directory, std::string_view json)
{
    WriteOutcome outcome;
    std::string shortReport;
    std::string_view content = json;
    if (json.size() > kMaxReportBytes) {
        shortReport = BuildShortReport(ReadReportFacts(json), "report too large; only the summary was kept", json.size());
        content = shortReport;
        outcome.shortened = true;
    }

    std::error_code ec;
    std::filesystem::create_directories(directory, ec);
    if (ec) {
        outcome.error = "cannot create the report folder: " + ec.message();
        return outcome;
    }

    const auto target = detail::FileIn(directory, kReportFileName);
    auto temp = target;
    temp += ".tmp";
    {
        std::ofstream file(temp, std::ios::binary | std::ios::trunc);
        if (!file.is_open()) {
            outcome.error = "cannot open the temporary report file";
            return outcome;
        }
        file.write(content.data(), static_cast<std::streamsize>(content.size()));
        file.flush();
        if (!file.good()) {
            outcome.error = "cannot write the temporary report file";
            file.close();
            std::filesystem::remove(temp, ec);
            return outcome;
        }
    }

    std::filesystem::rename(temp, target, ec);
    if (ec) {
        // A reader holding the old report open can block the replace; drop it and try once more.
        std::error_code removeEc;
        std::filesystem::remove(target, removeEc);
        ec.clear();
        std::filesystem::rename(temp, target, ec);
    }
    if (ec) {
        outcome.error = "cannot replace the report file: " + ec.message();
        std::error_code cleanupEc;
        std::filesystem::remove(temp, cleanupEc);
        return outcome;
    }

    outcome.written = true;
    return outcome;
}

/** Removes the report of an earlier session, so a session that never runs cannot pass it off as its own. */
inline bool RemoveOldReport(const std::filesystem::path& directory)
{
    std::error_code ec;
    const auto target = detail::FileIn(directory, kReportFileName);
    std::filesystem::remove(target, ec);
    if (ec) return false;
    auto temp = target;
    temp += ".tmp";
    std::filesystem::remove(temp, ec);
    return !ec;
}

}  // namespace TulliusWidgets::SelfTestSession

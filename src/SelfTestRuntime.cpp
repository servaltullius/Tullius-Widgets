#include "SelfTestRuntime.h"

#include "JsonUtils.h"
#include "NativeStorage.h"
#include "SelfTestSession.h"
#include "WidgetInteropContracts.h"

#include <chrono>
#include <ctime>
#include <mutex>
#include <optional>
#include <set>

namespace TulliusWidgets::SelfTestRuntime {
namespace {

std::mutex g_mutex;
SelfTestSession::RunTrigger g_trigger;
std::string g_runId;
std::set<std::string, std::less<>> g_loggedIgnores;

std::optional<std::filesystem::path> ReportDirectory()
{
    auto directory = SKSE::log::log_directory();
    if (!directory) {
        logger::error("Self-test: the SKSE log folder could not be found; the report cannot be written");
    }
    return directory;
}

// Local time, so the run can be matched with what the player saw; it only names the run.
std::string MakeRunId()
{
    const auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    std::tm local{};
    if (localtime_s(&local, &now) != 0) {
        return std::to_string(static_cast<long long>(now));
    }
    char buffer[32]{};
    std::strftime(buffer, sizeof(buffer), "%Y%m%d-%H%M%S", &local);
    return buffer;
}

std::string PluginVersion()
{
    const auto* declaration = SKSE::PluginDeclaration::GetSingleton();
    return declaration ? declaration->GetVersion().string() : std::string("unknown");
}

void WriteReportFile(std::string_view json)
{
    const auto directory = ReportDirectory();
    if (!directory) {
        return;
    }
    const auto outcome = SelfTestSession::WriteReport(*directory, json);
    if (!outcome.written) {
        logger::error("Self-test: the report could not be written: {}", outcome.error);
        return;
    }
    if (outcome.shortened) {
        logger::warn(
            "Self-test: the report ({} bytes) was over the limit; only its summary was written",
            json.size());
    }
}

}  // namespace

void InitializeForLaunch(const std::filesystem::path& gameRootPath)
{
    const auto pluginsDirectory = NativeStorage::GetSettingsDirectoryPath(gameRootPath);
    const auto state = SelfTestSession::CheckMarker(pluginsDirectory);
    if (state == SelfTestSession::MarkerState::kUnknown) {
        logger::warn("Self-test: could not check for the marker file; starting normally");
    }
    if (!SelfTestSession::StartsSession(state)) {
        return;
    }

    SelfTestSession::SetActiveForLaunch(true);
    logger::warn(
        "Self-test session: '{}' is present. Settings are not loaded or saved, game stats are not sent, "
        "and hotkeys are off for this launch. Remove the file and restart the game to play normally.",
        SelfTestSession::kMarkerFileName);

    if (const auto directory = ReportDirectory()) {
        if (!SelfTestSession::RemoveOldReport(*directory)) {
            logger::warn("Self-test: the report of an earlier session could not be removed");
        }
    }
}

void NoteGameLoaded()
{
    if (!SelfTestSession::IsActive()) {
        return;
    }
    std::scoped_lock lock(g_mutex);
    g_trigger.NoteGameLoaded(SelfTestSession::RunTrigger::Clock::now());
}

void PollOnVisibleHeartbeat(const std::function<bool(const char*)>& invokeScript)
{
    if (!SelfTestSession::IsActive()) {
        return;
    }

    std::string script;
    std::string giveUpReport;
    std::string runId;
    int attempt = 0;
    {
        std::scoped_lock lock(g_mutex);
        const auto action = g_trigger.Poll(SelfTestSession::RunTrigger::Clock::now(), true);
        if (action == SelfTestSession::RunTrigger::Action::kNone) {
            return;
        }
        if (g_runId.empty()) {
            g_runId = MakeRunId();
        }
        attempt = g_trigger.Attempts();
        runId = g_runId;
        if (action == SelfTestSession::RunTrigger::Action::kInvoke) {
            script = std::string(WidgetInteropContracts::kRunSelfTest) + "(\"" + JsonUtils::Escape(g_runId)
                + "\",\"" + JsonUtils::Escape(PluginVersion()) + "\")";
        } else {
            SelfTestSession::ReportFacts facts;
            facts.runId = g_runId;
            facts.status = "not-started";
            giveUpReport = SelfTestSession::BuildShortReport(
                facts, "the page never reported that it started", 0);
        }
    }

    if (!giveUpReport.empty()) {
        logger::error(
            "Self-test: the page did not start after {} attempts; see {}",
            attempt,
            SelfTestSession::kReportFileName);
        WriteReportFile(giveUpReport);
        return;
    }

    if (!invokeScript || !invokeScript(script.c_str())) {
        logger::warn("Self-test: could not ask the page to run (attempt {})", attempt);
        return;
    }
    logger::info("Self-test: asked the page to run (run {}, attempt {})", runId, attempt);
}

void HandleReport(const std::string& payload)
{
    if (!SelfTestSession::IsActive()) {
        LogIgnoredOnce("a self-test report outside a self-test session");
        return;
    }

    const auto facts = SelfTestSession::ReadReportFacts(payload);
    {
        std::scoped_lock lock(g_mutex);
        if (facts.runId.empty() || facts.runId != g_runId) {
            logger::warn("Self-test: ignored a report for run '{}' (current run '{}')", facts.runId, g_runId);
            return;
        }
        g_trigger.NoteReport(facts.status);
    }

    WriteReportFile(payload);

    if (facts.status == "started") {
        logger::info("Self-test: run {} started", facts.runId);
    } else if (facts.status == "finished") {
        logger::info(
            "Self-test: run {} finished, {} of {} passed, {} failed; see {}",
            facts.runId,
            facts.passed.value_or(0),
            facts.total.value_or(0),
            facts.failed.value_or(0),
            SelfTestSession::kReportFileName);
    }
}

void LogIgnoredOnce(std::string_view what)
{
    std::scoped_lock lock(g_mutex);
    if (g_loggedIgnores.contains(what)) {
        return;
    }
    g_loggedIgnores.emplace(what);
    logger::info("Self-test session: ignored {} (logged once per launch)", what);
}

}  // namespace TulliusWidgets::SelfTestRuntime

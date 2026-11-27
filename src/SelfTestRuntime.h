#pragma once

#include <filesystem>
#include <functional>
#include <string>
#include <string_view>

// Drives a self-test session (SelfTestSession.h holds the parts the native tests check).
namespace TulliusWidgets::SelfTestRuntime {

/** Decides at plugin load, before the view exists, whether this launch is a self-test session. */
void InitializeForLaunch(const std::filesystem::path& gameRootPath);

void NoteGameLoaded();

/**
 * Called on the game thread at a heartbeat while the view is shown and nothing hides it: asks the
 * page to run when it is time, and gives up with a report when it never starts.
 */
void PollOnVisibleHeartbeat(const std::function<bool(const char*)>& invokeScript);

/** A report from the page (started, after each scenario, finished). Runs on the game thread. */
void HandleReport(const std::string& payload);

/** Logs, once per launch and kind, that the session dropped something the page asked for. */
void LogIgnoredOnce(std::string_view what);

}  // namespace TulliusWidgets::SelfTestRuntime

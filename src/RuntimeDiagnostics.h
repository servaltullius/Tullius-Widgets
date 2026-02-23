#pragma once

#include <RE/Skyrim.h>
#include <REL/Relocation.h>
#include <SKSE/SKSE.h>

#include <filesystem>
#include <string>

namespace TulliusWidgets::RuntimeDiagnostics {

struct State {
    REL::Version runtimeVersion{};
    REL::Version skseVersion{};
    bool runtimeSupported{true};
    bool addressLibraryPresent{true};
    std::string addressLibraryPath;
    std::filesystem::path gameRootPath;
};

bool IsLikelySupportedRuntime(REL::Version runtimeVersion);
std::filesystem::path ResolveGameRootPath();
std::filesystem::path GetAddressLibraryPath(const std::filesystem::path& gameRootPath, REL::Version runtimeVersion);
State Collect(const SKSE::LoadInterface* loadInterface);
std::string BuildJson(const State& state);

}  // namespace TulliusWidgets::RuntimeDiagnostics

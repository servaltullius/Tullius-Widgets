#include "RuntimeDiagnostics.h"

#include "JsonUtils.h"

#ifndef NOMINMAX
#define NOMINMAX
#endif
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>

namespace TulliusWidgets::RuntimeDiagnostics {

bool IsLikelySupportedRuntime(REL::Version runtimeVersion)
{
    return runtimeVersion.major() == 1 && (runtimeVersion.minor() == 5 || runtimeVersion.minor() == 6);
}

std::filesystem::path ResolveGameRootPath()
{
    std::wstring exePathBuffer(MAX_PATH, L'\0');
    while (exePathBuffer.size() <= 32768) {
        const DWORD size = static_cast<DWORD>(exePathBuffer.size());
        const DWORD len = ::GetModuleFileNameW(nullptr, exePathBuffer.data(), size);
        if (len == 0) break;
        if (len < size - 1) {
            exePathBuffer.resize(len);
            std::filesystem::path exePath(exePathBuffer);
            auto parent = exePath.parent_path();
            if (!parent.empty()) return parent;
            break;
        }
        exePathBuffer.resize(exePathBuffer.size() * 2);
    }

    std::error_code ec;
    auto cwd = std::filesystem::current_path(ec);
    if (ec) {
        logger::warn("Failed to resolve current path for diagnostics: {}", ec.message());
        return {};
    }
    return cwd;
}

std::filesystem::path GetAddressLibraryPath(const std::filesystem::path& gameRootPath, REL::Version runtimeVersion)
{
    const bool usesVersionLib = runtimeVersion.minor() >= 6;
    const auto filename = std::string(usesVersionLib ? "versionlib-" : "version-") + runtimeVersion.string() + ".bin";
    return gameRootPath / "Data" / "SKSE" / "Plugins" / filename;
}

State Collect(const SKSE::LoadInterface* loadInterface)
{
    State state{};
    if (!loadInterface) return state;

    state.runtimeVersion = loadInterface->RuntimeVersion();
    state.skseVersion = REL::Version::unpack(loadInterface->SKSEVersion());
    state.runtimeSupported = IsLikelySupportedRuntime(state.runtimeVersion);
    state.gameRootPath = ResolveGameRootPath();

    const auto addressLibraryPath = GetAddressLibraryPath(state.gameRootPath, state.runtimeVersion);
    state.addressLibraryPath = addressLibraryPath.generic_string();
    std::error_code ec;
    state.addressLibraryPresent = std::filesystem::exists(addressLibraryPath, ec);
    if (ec) {
        logger::warn("Address Library path check failed ({}): {}", state.addressLibraryPath, ec.message());
        state.addressLibraryPresent = false;
    }

    return state;
}

std::string BuildJson(const State& state)
{
    const bool hasRuntimeWarning = !state.runtimeSupported;
    const bool hasAddressWarning = !state.addressLibraryPresent;
    std::string warningCode = "none";
    if (hasRuntimeWarning && hasAddressWarning) {
        warningCode = "unsupported-runtime-and-missing-address-library";
    } else if (hasRuntimeWarning) {
        warningCode = "unsupported-runtime";
    } else if (hasAddressWarning) {
        warningCode = "missing-address-library";
    }

    std::string json = "{";
    json += "\"runtimeVersion\":\"" + TulliusWidgets::JsonUtils::Escape(std::to_string(state.runtimeVersion)) + "\",";
    json += "\"skseVersion\":\"" + TulliusWidgets::JsonUtils::Escape(std::to_string(state.skseVersion)) + "\",";
    json += "\"addressLibraryPath\":\"" + TulliusWidgets::JsonUtils::Escape(state.addressLibraryPath) + "\",";
    json += "\"addressLibraryPresent\":" + std::string(state.addressLibraryPresent ? "true" : "false") + ",";
    json += "\"runtimeSupported\":" + std::string(state.runtimeSupported ? "true" : "false") + ",";
    json += "\"usesAddressLibrary\":true,";
    json += "\"warningCode\":\"" + warningCode + "\"";
    json += "}";
    return json;
}

}  // namespace TulliusWidgets::RuntimeDiagnostics

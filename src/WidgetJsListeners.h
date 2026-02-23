#pragma once

#include "PrismaUI_API.h"

#include <filesystem>

namespace TulliusWidgets::WidgetJsListeners {

struct Callbacks {
    std::filesystem::path (*resolveStorageBasePath)() = nullptr;
    bool (*invokeScript)(const char*) = nullptr;
    bool (*interopCall)(const char*, const char*) = nullptr;
    void (*unfocusView)() = nullptr;
};

void Register(PRISMA_UI_API::IVPrismaUI1* prismaUI, PrismaView view, const Callbacks& callbacks);

}  // namespace TulliusWidgets::WidgetJsListeners

// Behavioral test for src/MenuNameMatch.h. Built and run by
// scripts/menu-name-match.native.test.mjs with the host C++ compiler.

#include "MenuNameMatch.h"

#include <array>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <string_view>

#if defined(_WIN32)
#    include <windows.h>
#else
#    include <sys/mman.h>
#    include <unistd.h>
#endif

using namespace TulliusWidgets::MenuNameMatch;

namespace {

constexpr std::array<std::string_view, 4> kTokens = { "photo", "screenshot", "capture", "freecamera" };

int g_failures = 0;

void Check(bool condition, const char* expression, int line)
{
    if (!condition) {
        std::fprintf(stderr, "FAILED line %d: %s\n", line, expression);
        ++g_failures;
    }
}

#define CHECK(expr) Check((expr), #expr, __LINE__)

bool IsTransient(std::string_view reported)
{
    const auto trusted = TrustedMenuName(reported);
    return trusted && ContainsAnyLoweredToken(*trusted, kTokens);
}

// Allocates two pages and makes the second one inaccessible, so any read past
// the end of the first page crashes the test instead of passing silently.
char* AllocateGuardedPage(std::size_t& pageSize)
{
#if defined(_WIN32)
    SYSTEM_INFO info{};
    GetSystemInfo(&info);
    pageSize = info.dwPageSize;
    auto* base = static_cast<char*>(VirtualAlloc(nullptr, pageSize * 2, MEM_RESERVE | MEM_COMMIT, PAGE_READWRITE));
    DWORD oldProtect = 0;
    if (!base || !VirtualProtect(base + pageSize, pageSize, PAGE_NOACCESS, &oldProtect)) {
        return nullptr;
    }
    return base;
#else
    pageSize = static_cast<std::size_t>(sysconf(_SC_PAGESIZE));
    void* base = mmap(nullptr, pageSize * 2, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (base == MAP_FAILED || mprotect(static_cast<char*>(base) + pageSize, pageSize, PROT_NONE) != 0) {
        return nullptr;
    }
    return static_cast<char*>(base);
#endif
}

}  // namespace

int main()
{
    // Case-insensitive token matches.
    CHECK(IsTransient("PhotoMode"));
    CHECK(IsTransient("SCREENSHOT Menu"));
    CHECK(IsTransient("FreeCamera"));
    CHECK(IsTransient("xCapture"));
    CHECK(!IsTransient("Fader Menu"));
    CHECK(!IsTransient("phot"));
    CHECK(!IsTransient(""));

    // Validation: intact names pass unchanged.
    CHECK(TrustedMenuName("Fader Menu").value_or("x") == "Fader Menu");
    CHECK(TrustedMenuName(std::string_view{}).has_value());

    // Length cap boundary: 128 bytes is scanned, 129 is rejected.
    std::string atCap(kMaxTrustedMenuNameLength - 5, 'x');
    atCap += "PHOTO";
    CHECK(atCap.size() == kMaxTrustedMenuNameLength);
    CHECK(IsTransient(atCap));
    const std::string overCap = atCap + "x";
    CHECK(!TrustedMenuName(overCap).has_value());
    CHECK(!IsTransient(overCap));

    // A NUL before the reported end means the pool length is corrupted.
    constexpr char kEmbeddedNul[] = { 'p', 'h', 'o', 't', 'o', '\0', 'x', 'x' };
    CHECK(!TrustedMenuName(std::string_view(kEmbeddedNul, sizeof(kEmbeddedNul))).has_value());

    // Crash reproduction: a short string at the very end of a readable page,
    // reported with a multi-megabyte length (as seen in the 2026-11-23 CTDs),
    // or with a small but wrong length. Neither may touch the guard page.
    std::size_t pageSize = 0;
    char* page = AllocateGuardedPage(pageSize);
    CHECK(page != nullptr);
    if (page) {
        char* tail = page + pageSize - 8;
        std::memcpy(tail, "photo\0\0\0", 8);
        CHECK(!IsTransient(std::string_view(tail, 0x438182)));
        CHECK(!IsTransient(std::string_view(tail, 8)));

        char* noTerminator = page + pageSize - 5;
        std::memcpy(noTerminator, "Photo", 5);
        CHECK(IsTransient(std::string_view(noTerminator, 5)));
    }

    if (g_failures != 0) {
        std::fprintf(stderr, "%d check(s) failed\n", g_failures);
        return EXIT_FAILURE;
    }
    std::puts("menu_name_match_test: ok");
    return EXIT_SUCCESS;
}

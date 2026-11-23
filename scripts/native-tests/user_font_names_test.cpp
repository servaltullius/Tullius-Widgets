// Behavioral test for src/UserFontNames.h. Built and run by
// scripts/user-font-names.native.test.mjs, which generates user_font_name_cases.inc from
// view/src/data/userFontNameCases.json so the plugin and the view check the same table.

#include "UserFontNames.h"

#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

using namespace TulliusWidgets::UserFontNames;

namespace {

struct NameCase {
    const char* label;
    std::string name;
    bool valid;
};

const std::vector<NameCase> kNameCases = {
#include "user_font_name_cases.inc"
};

int g_failures = 0;

void Check(bool condition, const std::string& what)
{
    if (!condition) {
        std::fprintf(stderr, "FAILED: %s\n", what.c_str());
        ++g_failures;
    }
}

}  // namespace

int main()
{
    for (const auto& nameCase : kNameCases) {
        Check(IsValidName(nameCase.name) == nameCase.valid, std::string("name rule: ") + nameCase.label);
    }

    // Font type comes from the extension (any case); italic and oblique faces are skipped.
    Check(IsUsableFontFileName("Font-Regular.ttf"), "ttf");
    Check(IsUsableFontFileName("Font-Bold.OTF"), "upper-case otf");
    Check(IsUsableFontFileName("Font-Regular.subset.woff2"), "woff2 with a dotted stem");
    Check(IsUsableFontFileName("Font.woff"), "woff");
    Check(!IsUsableFontFileName("OFL.txt"), "licence text");
    Check(!IsUsableFontFileName("License, Copyright (c) 2020.md"), "licence markdown");
    Check(!IsUsableFontFileName("Font-Regular"), "no extension");
    Check(!IsUsableFontFileName("Font-Italic.ttf"), "italic");
    Check(!IsUsableFontFileName("Font-Bold Oblique.otf"), "oblique");
    Check(!IsUsableFontFileName("Font-BoldItalic.woff2"), "bold italic");

    // Names differing only in ASCII case count once, before the per-font limit applies.
    std::vector<std::string> files = { "z-Bold.ttf", "AAAA.ttf", "aaaa.ttf", "AaAa.ttf", "b.ttf" };
    SortAndDropCaseDuplicates(files);
    Check(files == std::vector<std::string>{ "AAAA.ttf", "b.ttf", "z-Bold.ttf" }, "case duplicates dropped after sorting");

    if (g_failures != 0) {
        std::fprintf(stderr, "%d check(s) failed\n", g_failures);
        return EXIT_FAILURE;
    }
    std::puts("user_font_names_test: ok");
    return EXIT_SUCCESS;
}

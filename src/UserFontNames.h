#pragma once

#include <algorithm>
#include <string>
#include <string_view>
#include <vector>

// Name rules for user font folders and files. Standard library only, so the same code the plugin
// runs is compiled by scripts/user-font-names.native.test.mjs against the cases the view tests use
// (view/src/data/userFontNameCases.json). The view mirrors these rules in data/userFonts.ts.
namespace TulliusWidgets::UserFontNames {

inline constexpr std::size_t kMaxNameBytes = 192;
// Every character here is legal in a Windows file name and is percent-encoded or CSS-escaped
// before it reaches a URL, so common font file names ("Font+Hangul", "A & B, Bold") stay usable.
inline constexpr std::string_view kNamePunctuation = " _-.()'[]+&,!#@~=;";

[[nodiscard]] inline bool IsValidUtf8(std::string_view name) noexcept
{
    for (std::size_t i = 0; i < name.size();) {
        const auto first = static_cast<unsigned char>(name[i++]);
        if (first < 0x80) continue;

        // The second-byte bounds reject overlong sequences, surrogates and values beyond U+10FFFF.
        const std::size_t remaining = first < 0xE0 ? 1 : first < 0xF0 ? 2 : 3;
        if (first < 0xC2 || first > 0xF4 || remaining > name.size() - i) return false;
        const auto second = static_cast<unsigned char>(name[i]);
        if ((first == 0xE0 && second < 0xA0) || (first == 0xED && second >= 0xA0) ||
            (first == 0xF0 && second < 0x90) || (first == 0xF4 && second >= 0x90)) return false;
        for (std::size_t j = 0; j < remaining; ++j) {
            if ((static_cast<unsigned char>(name[i++]) & 0xC0) != 0x80) return false;
        }
    }
    return true;
}

[[nodiscard]] inline bool IsAsciiLetter(unsigned char byte) noexcept
{
    return (byte >= 'A' && byte <= 'Z') || (byte >= 'a' && byte <= 'z');
}

[[nodiscard]] inline char LowercaseAscii(unsigned char byte) noexcept
{
    return static_cast<char>(byte >= 'A' && byte <= 'Z' ? byte + ('a' - 'A') : byte);
}

[[nodiscard]] inline std::string LowercaseAscii(std::string_view text)
{
    std::string lowered(text);
    std::transform(lowered.begin(), lowered.end(), lowered.begin(),
        [](char ch) { return LowercaseAscii(static_cast<unsigned char>(ch)); });
    return lowered;
}

// A folder name, or a file name including its extension.
[[nodiscard]] inline bool IsValidName(std::string_view name) noexcept
{
    if (name.empty() || name.size() > kMaxNameBytes || name.front() == '.' || name.back() == '.' ||
        name.front() == ' ' || name.back() == ' ' || name.find("..") != std::string_view::npos) return false;
    return IsValidUtf8(name) && std::all_of(name.begin(), name.end(), [](unsigned char byte) {
        return byte >= 0x80 || IsAsciiLetter(byte) || (byte >= '0' && byte <= '9') ||
               kNamePunctuation.find(static_cast<char>(byte)) != std::string_view::npos;
    });
}

// True for a .ttf/.otf/.woff2/.woff file that is not an italic or oblique face. Checked before
// the name rule so licence and readme files next to the fonts are ignored without a warning.
[[nodiscard]] inline bool IsUsableFontFileName(std::string_view fileName)
{
    const auto dot = fileName.rfind('.');
    if (dot == std::string_view::npos) return false;
    const auto extension = LowercaseAscii(fileName.substr(dot));
    if (extension != ".ttf" && extension != ".otf" && extension != ".woff2" && extension != ".woff") return false;

    std::string letters;
    for (unsigned char byte : fileName.substr(0, dot)) {
        if (IsAsciiLetter(byte)) letters += LowercaseAscii(byte);
    }
    return !letters.contains("italic") && !letters.contains("oblique");
}

// Sorts by UTF-8 bytes and drops names that differ only in ASCII case: they are one file on
// Windows, and duplicates must not use up the per-font limit before distinct files.
inline void SortAndDropCaseDuplicates(std::vector<std::string>& names)
{
    std::sort(names.begin(), names.end());
    std::vector<std::string> seen;
    std::erase_if(names, [&seen](const std::string& name) {
        auto key = LowercaseAscii(name);
        if (std::find(seen.begin(), seen.end(), key) != seen.end()) return true;
        seen.push_back(std::move(key));
        return false;
    });
}

}  // namespace TulliusWidgets::UserFontNames

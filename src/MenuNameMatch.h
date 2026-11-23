#pragma once

#include <algorithm>
#include <cctype>
#include <cstddef>
#include <cstring>
#include <iterator>
#include <optional>
#include <string_view>

namespace TulliusWidgets::MenuNameMatch {

// Real menu names are short identifiers ("Fader Menu", "TrueHUD", ...).
// A BSFixedString whose string-pool entry was freed or corrupted by another
// plugin can report a multi-megabyte length from its pool header, and walking
// that length reads far past the actual string. Names longer than this cap are
// treated as untrustworthy and never scanned.
inline constexpr std::size_t kMaxTrustedMenuNameLength = 128;

// Returns the name only when it looks intact: non-null, at most
// kMaxTrustedMenuNameLength bytes, and with no NUL before its reported end.
// A pool entry whose length disagrees with its terminator is corrupted, so the
// name is rejected instead of scanned. Reads at most the reported length.
[[nodiscard]] inline std::optional<std::string_view> TrustedMenuName(std::string_view reported) noexcept
{
    if (reported.data() == nullptr) {
        return reported.empty() ? std::optional<std::string_view>{ std::string_view{} } : std::nullopt;
    }
    if (reported.size() > kMaxTrustedMenuNameLength) {
        return std::nullopt;
    }
    if (::strnlen(reported.data(), reported.size()) != reported.size()) {
        return std::nullopt;
    }
    return reported;
}

// Case-insensitive substring search. `loweredToken` must already be lowercase.
// Does not allocate and reads at most `menuName.size()` bytes.
[[nodiscard]] inline bool ContainsLoweredToken(std::string_view menuName, std::string_view loweredToken) noexcept
{
    if (loweredToken.empty() || loweredToken.size() > menuName.size()) {
        return false;
    }

    const auto it = std::search(
        menuName.begin(),
        menuName.end(),
        loweredToken.begin(),
        loweredToken.end(),
        [](char nameChar, char tokenChar) {
            return static_cast<char>(std::tolower(static_cast<unsigned char>(nameChar))) == tokenChar;
        });
    return it != menuName.end();
}

// `trustedMenuName` must come from TrustedMenuName().
template <class Tokens>
[[nodiscard]] bool ContainsAnyLoweredToken(std::string_view trustedMenuName, const Tokens& loweredTokens) noexcept
{
    return std::any_of(
        std::begin(loweredTokens),
        std::end(loweredTokens),
        [trustedMenuName](std::string_view token) { return ContainsLoweredToken(trustedMenuName, token); });
}

}  // namespace TulliusWidgets::MenuNameMatch

#pragma once

#include <charconv>
#include <cctype>
#include <cstdint>
#include <cstdio>
#include <optional>
#include <string>
#include <string_view>

namespace TulliusWidgets::JsonUtils {

inline std::string Escape(std::string_view input)
{
    std::string out;
    out.reserve(input.size() * 2 + 2);
    for (unsigned char c : input) {
        switch (c) {
        case '\\':
            out += "\\\\";
            break;
        case '"':
            out += "\\\"";
            break;
        case '\b':
            out += "\\b";
            break;
        case '\f':
            out += "\\f";
            break;
        case '\n':
            out += "\\n";
            break;
        case '\r':
            out += "\\r";
            break;
        case '\t':
            out += "\\t";
            break;
        default:
            if (c < 0x20) {
                char unicodeBuf[7];
                std::snprintf(unicodeBuf, sizeof(unicodeBuf), "\\u%04X", static_cast<unsigned int>(c));
                out += unicodeBuf;
            } else {
                out += static_cast<char>(c);
            }
            break;
        }
    }
    return out;
}

inline std::optional<std::uint32_t> TryReadUIntField(std::string_view input, std::string_view key)
{
    const std::string needle = "\"" + std::string(key) + "\"";
    std::size_t searchOffset = 0;

    while (true) {
        const auto keyPos = input.find(needle, searchOffset);
        if (keyPos == std::string_view::npos) {
            return std::nullopt;
        }

        const auto colonPos = input.find(':', keyPos + needle.size());
        if (colonPos == std::string_view::npos) {
            return std::nullopt;
        }

        auto valuePos = colonPos + 1;
        while (valuePos < input.size() && std::isspace(static_cast<unsigned char>(input[valuePos]))) {
            ++valuePos;
        }

        std::uint32_t value = 0;
        const char* begin = input.data() + valuePos;
        const char* end = input.data() + input.size();
        const auto [ptr, ec] = std::from_chars(begin, end, value);
        if (ec == std::errc{} && ptr != begin) {
            return value;
        }

        searchOffset = keyPos + needle.size();
    }
}

}  // namespace TulliusWidgets::JsonUtils

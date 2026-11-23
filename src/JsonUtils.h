#pragma once

#include <charconv>
#include <cstdint>
#include <cstdio>
#include <initializer_list>
#include <iterator>
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

namespace detail {

inline void SkipWhitespace(std::string_view input, std::size_t& pos)
{
    while (pos < input.size()) {
        const char c = input[pos];
        if (c != ' ' && c != '\t' && c != '\n' && c != '\r') {
            return;
        }
        ++pos;
    }
}

inline bool ReadHex4(std::string_view input, std::size_t pos, std::uint32_t& out)
{
    if (input.size() - pos < 4) {
        return false;
    }
    out = 0;
    for (std::size_t i = 0; i < 4; ++i) {
        const char c = input[pos + i];
        out <<= 4;
        if (c >= '0' && c <= '9') {
            out |= static_cast<std::uint32_t>(c - '0');
        } else if (c >= 'a' && c <= 'f') {
            out |= static_cast<std::uint32_t>(c - 'a' + 10);
        } else if (c >= 'A' && c <= 'F') {
            out |= static_cast<std::uint32_t>(c - 'A' + 10);
        } else {
            return false;
        }
    }
    return true;
}

inline void AppendUtf8(std::string& out, std::uint32_t codeUnit)
{
    if (codeUnit < 0x80) {
        out += static_cast<char>(codeUnit);
    } else if (codeUnit < 0x800) {
        out += static_cast<char>(0xC0 | (codeUnit >> 6));
        out += static_cast<char>(0x80 | (codeUnit & 0x3F));
    } else {
        out += static_cast<char>(0xE0 | (codeUnit >> 12));
        out += static_cast<char>(0x80 | ((codeUnit >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (codeUnit & 0x3F));
    }
}

// Reads the JSON string starting at input[pos] == '"' and leaves pos just past
// the closing quote. When `decoded` is non-null the unescaped text is stored
// there (\uXXXX is decoded per UTF-16 code unit, which is exact for the ASCII
// member names this header looks up). Returns false on an unterminated string
// or an invalid escape.
inline bool ReadString(std::string_view input, std::size_t& pos, std::string* decoded)
{
    if (pos >= input.size() || input[pos] != '"') {
        return false;
    }
    ++pos;
    while (pos < input.size()) {
        const char c = input[pos];
        if (c == '"') {
            ++pos;
            return true;
        }
        if (c != '\\') {
            if (decoded) {
                *decoded += c;
            }
            ++pos;
            continue;
        }

        if (pos + 1 >= input.size()) {
            return false;
        }
        const char escape = input[pos + 1];
        char simple = 0;
        switch (escape) {
        case '"':
        case '\\':
        case '/':
            simple = escape;
            break;
        case 'b':
            simple = '\b';
            break;
        case 'f':
            simple = '\f';
            break;
        case 'n':
            simple = '\n';
            break;
        case 'r':
            simple = '\r';
            break;
        case 't':
            simple = '\t';
            break;
        case 'u': {
            std::uint32_t codeUnit = 0;
            if (!ReadHex4(input, pos + 2, codeUnit)) {
                return false;
            }
            if (decoded) {
                AppendUtf8(*decoded, codeUnit);
            }
            pos += 6;
            continue;
        }
        default:
            return false;
        }
        if (decoded) {
            *decoded += simple;
        }
        pos += 2;
    }
    return false;
}

// Skips one JSON value of any type starting at input[pos]. Containers are
// skipped iteratively by bracket depth (strings inside them are skipped whole,
// so brackets or quotes in string values are never counted), which keeps deep
// nesting from growing the stack.
inline bool SkipValue(std::string_view input, std::size_t& pos)
{
    if (pos >= input.size()) {
        return false;
    }

    const char first = input[pos];
    if (first == '"') {
        return ReadString(input, pos, nullptr);
    }

    if (first == '{' || first == '[') {
        std::size_t depth = 0;
        while (pos < input.size()) {
            const char c = input[pos];
            if (c == '"') {
                if (!ReadString(input, pos, nullptr)) {
                    return false;
                }
                continue;
            }
            if (c == '{' || c == '[') {
                ++depth;
            } else if (c == '}' || c == ']') {
                --depth;
                if (depth == 0) {
                    ++pos;
                    return true;
                }
            }
            ++pos;
        }
        return false;
    }

    // Number or literal: runs until the next structural character or whitespace.
    const std::size_t start = pos;
    while (pos < input.size()) {
        const char c = input[pos];
        if (c == ',' || c == '}' || c == ']' || c == ' ' || c == '\t' || c == '\n' || c == '\r') {
            break;
        }
        if (c == '"' || c == '{' || c == '[' || c == ':') {
            return false;
        }
        ++pos;
    }
    return pos > start;
}

}  // namespace detail

// Reads an unsigned integer stored at an object member path, e.g. {"rev"} for a
// top-level member or {"general", "settingsHotkey"} for a nested one. Only real
// member names at the given depth match: a string VALUE that spells a member
// name, or a same-named member at another depth, is ignored. The first member
// with a matching name decides the result; it yields nullopt when its value is
// not a non-negative number that fits in uint32 (the integer prefix of a number
// is used, as before). Malformed JSON before the member also yields nullopt, but
// anything after the member is not inspected. A leading UTF-8 BOM is skipped so
// hand-edited settings files keep working.
inline std::optional<std::uint32_t> TryReadUIntMember(
    std::string_view input,
    std::initializer_list<std::string_view> path)
{
    if (path.size() == 0) {
        return std::nullopt;
    }

    constexpr std::string_view kUtf8Bom = "\xEF\xBB\xBF";
    std::size_t pos = input.substr(0, kUtf8Bom.size()) == kUtf8Bom ? kUtf8Bom.size() : 0;

    detail::SkipWhitespace(input, pos);
    if (pos >= input.size() || input[pos] != '{') {
        return std::nullopt;
    }
    ++pos;

    auto segment = path.begin();
    std::string memberName;
    while (true) {
        detail::SkipWhitespace(input, pos);
        memberName.clear();
        if (!detail::ReadString(input, pos, &memberName)) {
            return std::nullopt;  // '}' (member absent at this level) or malformed input.
        }

        detail::SkipWhitespace(input, pos);
        if (pos >= input.size() || input[pos] != ':') {
            return std::nullopt;
        }
        ++pos;
        detail::SkipWhitespace(input, pos);
        if (pos >= input.size()) {
            return std::nullopt;
        }

        if (memberName == *segment) {
            if (std::next(segment) == path.end()) {
                std::uint32_t value = 0;
                const char* begin = input.data() + pos;
                const char* end = input.data() + input.size();
                const auto [ptr, ec] = std::from_chars(begin, end, value);
                if (ec == std::errc{} && ptr != begin) {
                    return value;
                }
                return std::nullopt;
            }
            if (input[pos] != '{') {
                return std::nullopt;
            }
            ++segment;
            ++pos;
            continue;
        }

        if (!detail::SkipValue(input, pos)) {
            return std::nullopt;
        }
        detail::SkipWhitespace(input, pos);
        if (pos >= input.size() || input[pos] != ',') {
            return std::nullopt;  // End of the object without the member, or malformed input.
        }
        ++pos;
    }
}

}  // namespace TulliusWidgets::JsonUtils

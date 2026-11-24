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
// member names this header looks up). Returns false on an unterminated string,
// a raw control character or an invalid escape.
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
        if (static_cast<unsigned char>(c) < 0x20) {
            return false;
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

inline bool IsDigit(char c)
{
    return c >= '0' && c <= '9';
}

// Skips a number matching the JSON grammar:
// -? (0 | [1-9][0-9]*) (.[0-9]+)? ([eE][+-]?[0-9]+)?
inline bool SkipNumber(std::string_view input, std::size_t& pos)
{
    if (pos < input.size() && input[pos] == '-') {
        ++pos;
    }
    if (pos >= input.size() || !IsDigit(input[pos])) {
        return false;
    }
    if (input[pos] == '0') {
        ++pos;
    } else {
        while (pos < input.size() && IsDigit(input[pos])) {
            ++pos;
        }
    }
    if (pos < input.size() && input[pos] == '.') {
        ++pos;
        if (pos >= input.size() || !IsDigit(input[pos])) {
            return false;
        }
        while (pos < input.size() && IsDigit(input[pos])) {
            ++pos;
        }
    }
    if (pos < input.size() && (input[pos] == 'e' || input[pos] == 'E')) {
        ++pos;
        if (pos < input.size() && (input[pos] == '+' || input[pos] == '-')) {
            ++pos;
        }
        if (pos >= input.size() || !IsDigit(input[pos])) {
            return false;
        }
        while (pos < input.size() && IsDigit(input[pos])) {
            ++pos;
        }
    }
    return true;
}

// Skips a string, number, true, false or null.
inline bool SkipScalar(std::string_view input, std::size_t& pos)
{
    if (pos >= input.size()) {
        return false;
    }
    const char c = input[pos];
    if (c == '"') {
        return ReadString(input, pos, nullptr);
    }
    if (c == '-' || IsDigit(c)) {
        return SkipNumber(input, pos);
    }
    for (const std::string_view literal : { std::string_view("true"), std::string_view("false"), std::string_view("null") }) {
        if (input.substr(pos, literal.size()) == literal) {
            pos += literal.size();
            return true;
        }
    }
    return false;
}

// Reads `"name" :` and leaves pos at the member value.
inline bool ReadMemberName(std::string_view input, std::size_t& pos, std::string* decoded)
{
    SkipWhitespace(input, pos);
    if (!ReadString(input, pos, decoded)) {
        return false;
    }
    SkipWhitespace(input, pos);
    if (pos >= input.size() || input[pos] != ':') {
        return false;
    }
    ++pos;
    SkipWhitespace(input, pos);
    return pos < input.size();
}

// Skips one JSON value of any type starting at input[pos], validating it.
// Containers are tracked on an explicit stack of expected closing brackets
// instead of recursion, so deep nesting cannot overflow the call stack.
inline bool SkipValue(std::string_view input, std::size_t& pos)
{
    std::string closers;
    while (true) {
        // Expecting a value.
        SkipWhitespace(input, pos);
        if (pos >= input.size()) {
            return false;
        }
        const char c = input[pos];
        if (c == '{' || c == '[') {
            const char closer = c == '{' ? '}' : ']';
            ++pos;
            SkipWhitespace(input, pos);
            if (pos < input.size() && input[pos] == closer) {
                ++pos;
            } else {
                closers += closer;
                if (closer == '}' && !ReadMemberName(input, pos, nullptr)) {
                    return false;
                }
                continue;
            }
        } else if (!SkipScalar(input, pos)) {
            return false;
        }

        // A value just ended: close finished containers or move to the next element.
        while (true) {
            if (closers.empty()) {
                return true;
            }
            SkipWhitespace(input, pos);
            if (pos >= input.size()) {
                return false;
            }
            if (input[pos] == closers.back()) {
                ++pos;
                closers.pop_back();
                continue;
            }
            if (input[pos] != ',') {
                return false;
            }
            ++pos;
            if (closers.back() == '}' && !ReadMemberName(input, pos, nullptr)) {
                return false;
            }
            break;
        }
    }
}

// Converts an already validated JSON value to uint32. Only non-negative numbers
// without an exponent that fit qualify; a fraction is truncated toward zero.
inline std::optional<std::uint32_t> ToUInt(std::string_view token)
{
    if (token.empty() || !IsDigit(token.front()) || token.find_first_of("eE") != std::string_view::npos) {
        return std::nullopt;
    }
    std::uint32_t value = 0;
    const auto [ptr, ec] = std::from_chars(token.data(), token.data() + token.size(), value);
    if (ec != std::errc{} || ptr == token.data()) {
        return std::nullopt;
    }
    return value;
}

using PathIterator = std::initializer_list<std::string_view>::const_iterator;

// Scans the object at input[pos] == '{' to its end. Every member named
// *segment replaces the previous result, as JSON.parse keeps the last
// duplicate: a leaf member yields its raw token, and an
// intermediate member restarts the lookup inside its object. Recursion depth is
// bounded by the path length.
inline bool ScanObject(
    std::string_view input,
    std::size_t& pos,
    PathIterator segment,
    PathIterator pathEnd,
    std::optional<std::string_view>& result)
{
    ++pos;
    SkipWhitespace(input, pos);
    if (pos < input.size() && input[pos] == '}') {
        ++pos;
        return true;
    }

    std::string memberName;
    while (true) {
        memberName.clear();
        if (!ReadMemberName(input, pos, &memberName)) {
            return false;
        }

        if (memberName != *segment) {
            if (!SkipValue(input, pos)) {
                return false;
            }
        } else if (std::next(segment) == pathEnd) {
            const auto valueStart = pos;
            if (!SkipValue(input, pos)) {
                return false;
            }
            result = input.substr(valueStart, pos - valueStart);
        } else if (input[pos] == '{') {
            result.reset();
            if (!ScanObject(input, pos, std::next(segment), pathEnd, result)) {
                return false;
            }
        } else {
            result.reset();
            if (!SkipValue(input, pos)) {
                return false;
            }
        }

        SkipWhitespace(input, pos);
        if (pos >= input.size()) {
            return false;
        }
        if (input[pos] == '}') {
            ++pos;
            return true;
        }
        if (input[pos] != ',') {
            return false;
        }
        ++pos;
    }
}

// Finds a raw token at an object member path the way the view's JSON.parse sees it:
// - Only real member names at the given depth match. A string VALUE that spells
//   a member name, or a same-named member at another depth, is ignored.
// - When a name repeats, the last occurrence wins, at every level of the path.
// - The whole document must be valid JSON whose root is an object (a leading
//   UTF-8 BOM is allowed); otherwise the result is nullopt.
inline std::optional<std::string_view> FindMemberToken(
    std::string_view input,
    std::initializer_list<std::string_view> path)
{
    if (path.size() == 0) {
        return std::nullopt;
    }

    constexpr std::string_view kUtf8Bom = "\xEF\xBB\xBF";
    std::size_t pos = input.substr(0, kUtf8Bom.size()) == kUtf8Bom ? kUtf8Bom.size() : 0;

    SkipWhitespace(input, pos);
    if (pos >= input.size() || input[pos] != '{') {
        return std::nullopt;
    }

    std::optional<std::string_view> result;
    if (!ScanObject(input, pos, path.begin(), path.end(), result)) {
        return std::nullopt;
    }
    SkipWhitespace(input, pos);
    if (pos != input.size()) {
        return std::nullopt;
    }
    return result;
}

}  // namespace detail

// The token must be a non-negative JSON number without an exponent that fits
// in uint32; a fraction is truncated toward zero.
inline std::optional<std::uint32_t> TryReadUIntMember(
    std::string_view input,
    std::initializer_list<std::string_view> path)
{
    const auto token = detail::FindMemberToken(input, path);
    return token ? detail::ToUInt(*token) : std::nullopt;
}

inline std::optional<std::string> TryReadStringMember(
    std::string_view input,
    std::initializer_list<std::string_view> path)
{
    const auto token = detail::FindMemberToken(input, path);
    if (!token || token->front() != '"') {
        return std::nullopt;
    }

    std::size_t pos = 0;
    std::string decoded;
    if (!detail::ReadString(*token, pos, &decoded)) {
        return std::nullopt;
    }
    return decoded;
}

}  // namespace TulliusWidgets::JsonUtils

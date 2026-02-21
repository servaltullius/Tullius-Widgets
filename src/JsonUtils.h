#pragma once

#include <cstdio>
#include <string>
#include <string_view>

namespace TulliusWidgets::JsonUtils {

inline std::string Escape(std::string_view input)
{
    std::string out;
    out.reserve(input.size() + 8);
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

}  // namespace TulliusWidgets::JsonUtils

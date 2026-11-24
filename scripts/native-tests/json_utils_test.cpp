// Behavioral test for src/JsonUtils.h. Built and run by
// scripts/json-utils.native.test.mjs with the host C++ compiler.

#include "JsonUtils.h"

#include <cstdint>
#include <cstdio>
#include <optional>
#include <string>
#include <string_view>

using TulliusWidgets::JsonUtils::TryReadUIntMember;
using TulliusWidgets::JsonUtils::TryReadStringMember;

namespace {

int g_failures = 0;

void Check(bool condition, const char* expression, int line)
{
    if (!condition) {
        std::fprintf(stderr, "FAILED line %d: %s\n", line, expression);
        ++g_failures;
    }
}

#define CHECK(expr) Check((expr), #expr, __LINE__)

bool Is(const std::optional<std::uint32_t>& actual, std::uint32_t expected)
{
    return actual.has_value() && *actual == expected;
}

std::optional<std::uint32_t> Rev(std::string_view json)
{
    return TryReadUIntMember(json, { "rev" });
}

std::optional<std::uint32_t> SettingsHotkey(std::string_view json)
{
    return TryReadUIntMember(json, { "general", "settingsHotkey" });
}

std::optional<std::uint32_t> VisibilityHotkey(std::string_view json)
{
    return TryReadUIntMember(json, { "general", "visibilityHotkey" });
}

// Shaped like serializeSettingsPayload(): the settings object, then
// schemaVersion, then rev last.
std::string Payload(std::string_view iconPack, std::string_view userFont)
{
    std::string json = R"({"general":{"visible":true,"opacity":100,"iconPack":")";
    json += iconPack;
    json += R"(","userFont":")";
    json += userFont;
    json += R"(","changeDisplaySeconds":3,"settingsHotkey":210,"visibilityHotkey":87,"showIconBadges":true},)";
    json += R"("itemLayouts":{"health":{"visible":true,"x":12,"y":34,"zIndex":5}},"schemaVersion":7,"rev":42})";
    return json;
}

void TestRealisticPayloads()
{
    const auto plain = Payload("", "");
    CHECK(Is(Rev(plain), 42));
    CHECK(Is(SettingsHotkey(plain), 210));
    CHECK(Is(VisibilityHotkey(plain), 87));

    // User-chosen folder names that spell the looked-up member names. The old
    // substring search read the number after the next ':' (here 3 or 210).
    for (const std::string_view name : { "rev", "settingsHotkey", "visibilityHotkey" }) {
        for (const auto& json : { Payload(name, ""), Payload("", name), Payload(name, name) }) {
            CHECK(Is(Rev(json), 42));
            CHECK(Is(SettingsHotkey(json), 210));
            CHECK(Is(VisibilityHotkey(json), 87));
        }
    }
}

void TestWrongDepthIsIgnored()
{
    CHECK(Is(Rev(R"({"general":{"rev":1},"rev":2})"), 2));
    CHECK(!Rev(R"({"general":{"rev":1}})").has_value());
    CHECK(!Rev(R"({"list":[{"rev":1}],"other":{"deep":{"rev":3}}})").has_value());

    CHECK(!SettingsHotkey(R"({"settingsHotkey":210})").has_value());
    CHECK(Is(SettingsHotkey(R"({"settingsHotkey":1,"general":{"settingsHotkey":2}})"), 2));
    CHECK(!SettingsHotkey(R"({"other":{"general":{"settingsHotkey":5}}})").has_value());
    CHECK(!SettingsHotkey(R"({"general":"settingsHotkey","x":5})").has_value());
    CHECK(!SettingsHotkey(R"({"general":{"nested":{"settingsHotkey":5}}})").has_value());
    CHECK(!SettingsHotkey(R"({"general":5})").has_value());
}

void TestStringValuesAreSkipped()
{
    // Escaped quotes, colons, braces and brackets inside string values.
    CHECK(Is(Rev(R"({"a":"x\":\"rev\":1","b":"{[}]","rev":9})"), 9));
    CHECK(Is(Rev(R"({"a":"\\","rev":9})"), 9));
    CHECK(Is(Rev(R"({"a":"\\\"rev\":1","rev":9})"), 9));
    CHECK(Is(Rev(R"({"a":["rev",{"rev":1},"]"],"rev":9})"), 9));
    CHECK(Is(Rev(R"({"a":"\u0022rev\u0022:1","rev":9})"), 9));
    // Escaped member names still match by their decoded text.
    CHECK(Is(Rev(R"({"\u0072ev":9})"), 9));
    CHECK(!Rev(R"({"re\"v":9})").has_value());
    CHECK(!Rev(R"({"revision":9})").has_value());
}

void TestFormattingTolerance()
{
    CHECK(Is(Rev("{\n  \"general\" : {\n\t\"rev\" : 1\n  } ,\r\n  \"rev\" :\t 7\n}\n"), 7));
    CHECK(Is(SettingsHotkey("  {\"general\" :\n {\"settingsHotkey\" : 199 }}"), 199));
    CHECK(Is(Rev("\xEF\xBB\xBF{\"rev\":5}"), 5));
    CHECK(Is(Rev(R"({"a":null,"b":true,"c":false,"d":-1.5e3,"e":[],"f":{},"rev":3})"), 3));
    CHECK(Is(Rev(R"({"rev":0})"), 0));
    CHECK(Is(Rev(R"({"rev":4294967295})"), 4294967295u));
    // Integer prefix of a number, as before.
    CHECK(Is(Rev(R"({"rev":12.5})"), 12));
}

void TestRejectedValues()
{
    CHECK(!Rev(R"({"rev":-1})").has_value());
    CHECK(!Rev(R"({"rev":4294967296})").has_value());
    CHECK(!Rev(R"({"rev":"5"})").has_value());
    CHECK(!Rev(R"({"rev":null})").has_value());
    CHECK(!Rev(R"({"rev":{"rev":5}})").has_value());
    CHECK(!Rev(R"({"rev":1e3})").has_value());
    CHECK(!Rev(R"({"rev":-0})").has_value());
    CHECK(!Rev(R"({"rev":true})").has_value());
}

// Same results as the view's JSON.parse, which keeps the last duplicate.
void TestDuplicateMembersLastWins()
{
    CHECK(Is(Rev(R"({"rev":1,"rev":2})"), 2));
    CHECK(Is(Rev(R"({"rev":"x","rev":5})"), 5));
    CHECK(!Rev(R"({"rev":5,"rev":"x"})").has_value());

    CHECK(Is(SettingsHotkey(R"({"general":{"settingsHotkey":1,"settingsHotkey":3}})"), 3));
    CHECK(Is(SettingsHotkey(R"({"general":{"settingsHotkey":1},"general":{"settingsHotkey":2}})"), 2));
    // A later same-named object replaces the earlier one wholesale.
    CHECK(!SettingsHotkey(R"({"general":{"settingsHotkey":1},"general":{}})").has_value());
    CHECK(!SettingsHotkey(R"({"general":{"settingsHotkey":1},"general":5})").has_value());
    CHECK(Is(SettingsHotkey(R"({"general":5,"general":{"settingsHotkey":4}})"), 4));
    CHECK(Is(VisibilityHotkey(R"({"general":{"visibilityHotkey":1},"x":0,"general":{"visibilityHotkey":87}})"), 87));
}

void TestMalformedInput()
{
    CHECK(!Rev("").has_value());
    CHECK(!Rev("   ").has_value());
    CHECK(!Rev("[{\"rev\":1}]").has_value());
    CHECK(!Rev("\"rev\":1").has_value());
    CHECK(!Rev("{}").has_value());
    CHECK(!Rev("{\"rev\"").has_value());
    CHECK(!Rev("{\"rev\":").has_value());
    CHECK(!Rev("{\"rev\" 1}").has_value());
    CHECK(!Rev("{\"a\":\"unterminated, \"rev\":1").has_value());
    CHECK(!Rev("{\"a\":\"bad \\x escape\",\"rev\":1}").has_value());
    CHECK(!Rev("{\"a\":\"\\u12\",\"rev\":1}").has_value());
    CHECK(!Rev("{\"a\":[1,2,\"rev\":1").has_value());
    CHECK(!Rev("{\"a\":1 \"rev\":1}").has_value());
    CHECK(!Rev("{\"a\":,\"rev\":1}").has_value());
    CHECK(!Rev("{rev:1}").has_value());
    CHECK(!Rev("{\"a\":1,}").has_value());
    CHECK(!SettingsHotkey(R"({"general":{"settingsHotkey")").has_value());

    // The whole document is validated, including what follows the member.
    CHECK(!Rev(R"({"rev":8,)").has_value());
    CHECK(!Rev(R"({"rev":8)").has_value());
    CHECK(!Rev(R"({"rev":8}})").has_value());
    CHECK(!Rev(R"({"rev":8} x)").has_value());
    CHECK(!Rev(R"({"rev":8,"a":[1})").has_value());
    CHECK(!Rev(R"({"rev":01})").has_value());

    // Mismatched brackets and invalid scalars before the member.
    CHECK(!Rev(R"({"a":[1},"rev":2})").has_value());
    CHECK(!Rev(R"({"a":{"b":1]],"rev":2})").has_value());
    CHECK(!Rev(R"({"a":abc,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":tru,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":truex,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":1.,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":.5,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":1e,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":--1,"rev":2})").has_value());
    CHECK(!Rev(R"({"a":[1,],"rev":2})").has_value());
    CHECK(!Rev(R"({"a":[,1],"rev":2})").has_value());
    CHECK(!Rev(R"({"a":{"b"},"rev":2})").has_value());
    CHECK(!Rev(R"({"a":{"b":1,},"rev":2})").has_value());
    CHECK(!Rev(R"({"a":{1:2},"rev":2})").has_value());
    CHECK(!Rev("{\"a\":\"raw\nnewline\",\"rev\":2}").has_value());
    // Valid nested containers of every kind still pass.
    CHECK(Is(Rev(R"({"a":[{},[],{"b":[1,-2.5E+3,"]",null]},[[]]],"rev":2})"), 2));
    CHECK(!TryReadUIntMember(R"({"rev":1})", {}).has_value());

    // Deep nesting is skipped without recursion.
    std::string deep = "{\"a\":";
    deep.append(200000, '[');
    deep.append(200000, ']');
    deep += ",\"rev\":6}";
    CHECK(Is(Rev(deep), 6));
}

void TestStringMembers()
{
    const auto read = [](std::string_view json) {
        return TryReadStringMember(json, { "general", "freeCameraDisplay" });
    };
    CHECK(read(R"({"general":{"freeCameraDisplay":"vitals"}})") == "vitals");
    CHECK(read(R"({"general":{"freeCameraDisplay":"\u0061l\u006c"}})") == "all");
    CHECK(read(R"({"gene\u0072al":{"freeCameraDisplay":"all"}})") == "all");
    CHECK(read(R"({"general":{"freeCameraDisplay":"hide","freeCameraDisplay":"all"}})") == "all");
    CHECK(read(R"({"general":{"freeCameraDisplay":"hide"},"general":{"freeCameraDisplay":"all"}})") == "all");
    CHECK(read(R"({"general":{"iconPack":"freeCameraDisplay","freeCameraDisplay":"all"}})") == "all");
    CHECK(!read(R"({"general":{"iconPack":"freeCameraDisplay","value":"all"}})"));
    CHECK(!read(R"({"x":{"general":{"freeCameraDisplay":"all"}}})"));
    CHECK(!read(R"({"general":{"freeCameraDisplay":"all"},"general":[]})"));
    CHECK(!read(R"({"general":{"freeCameraDisplay":"all"},"general":{}})"));
    CHECK(!read(R"({"general":{"freeCameraDisplay":"all","freeCameraDisplay":42}})"));
    CHECK(!read(R"({"general":{"freeCameraDisplay":null}})"));
    CHECK(read("\xEF\xBB\xBF" R"({"general":{"freeCameraDisplay":"hide"}})") == "hide");
    CHECK(!read(R"({"general":{"freeCameraDisplay":"all"},"x":[1,]})"));
    CHECK(!read(R"({"general":{"freeCameraDisplay":"a\xell"}})"));
    CHECK(!read(R"({"general":{"freeCameraDisplay":"all"}} trailing)"));
}

}  // namespace

int main()
{
    TestRealisticPayloads();
    TestWrongDepthIsIgnored();
    TestStringValuesAreSkipped();
    TestFormattingTolerance();
    TestRejectedValues();
    TestDuplicateMembersLastWins();
    TestMalformedInput();
    TestStringMembers();

    if (g_failures != 0) {
        std::fprintf(stderr, "json_utils_test: %d failure(s)\n", g_failures);
        return 1;
    }
    std::printf("json_utils_test: ok\n");
    return 0;
}

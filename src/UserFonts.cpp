#include "UserFonts.h"

#include "JsonUtils.h"
#include "UserFontNames.h"

#include <Windows.h>
#include <algorithm>
#include <exception>
#include <string_view>
#include <system_error>
#include <utility>
#include <vector>

namespace TulliusWidgets::UserFonts {
namespace {

namespace fs = std::filesystem;
using namespace TulliusWidgets::UserFontNames;

constexpr std::size_t kMaxFonts = 32;
constexpr std::size_t kMaxFilesPerFont = 16;
struct Font {
    std::string id;
    std::string foldedId;
    std::vector<std::string> files;
};

std::string ToUtf8(const fs::path& path)
{
    const auto utf8 = path.u8string();
    return std::string(reinterpret_cast<const char*>(utf8.data()), utf8.size());
}

std::string LowercaseFolderName(const fs::path& name)
{
    // Use invariant casing so the listing order does not depend on the player's locale.
    const auto& native = name.native();
    const auto length = static_cast<int>(native.size());
    const auto required = LCMapStringEx(LOCALE_NAME_INVARIANT, LCMAP_LOWERCASE, native.data(), length,
        nullptr, 0, nullptr, nullptr, 0);
    if (required == 0) {
        throw std::system_error(static_cast<int>(GetLastError()), std::system_category(), "LCMapStringEx");
    }
    std::wstring lower(required, L'\0');
    if (LCMapStringEx(LOCALE_NAME_INVARIANT, LCMAP_LOWERCASE, native.data(), length,
            lower.data(), required, nullptr, nullptr, 0) == 0) {
        throw std::system_error(static_cast<int>(GetLastError()), std::system_category(), "LCMapStringEx");
    }
    return ToUtf8(fs::path(lower));
}

std::vector<std::string> CollectFontFiles(const fs::path& folder, std::string_view id)
{
    std::vector<std::string> files;
    std::error_code ec;
    for (fs::directory_iterator it(folder, ec), end; it != end; it.increment(ec)) {
        try {
            // Licence and readme files sit next to fonts; only font files are worth a warning.
            if (!it->is_regular_file()) continue;
            auto name = ToUtf8(it->path().filename());
            if (!IsUsableFontFileName(name)) continue;
            if (!IsValidName(name)) {
                logger::warn("Unsupported user font file name in {}: {}", id, name);
                continue;
            }
            if (it->file_size() != 0) files.push_back(std::move(name));
        } catch (const std::exception& error) {
            // This includes filesystem_error from status, UTF-8 conversion and file size queries.
            logger::warn("Could not inspect a user font file in {}: {}", id, error.what());
        }
    }
    if (ec) logger::warn("Could not list user font files in {}: {}", id, ec.message());

    SortAndDropCaseDuplicates(files);
    if (files.size() > kMaxFilesPerFont) {
        for (std::size_t i = kMaxFilesPerFont; i < files.size(); ++i) {
            logger::warn("User font file limit reached in {}, skipping {}", id, files[i]);
        }
        files.resize(kMaxFilesPerFont);
    }
    return files;
}

}  // namespace

std::filesystem::path GetUserFontsDirectory(const std::filesystem::path& gameRootPath)
{
    return gameRootPath / "Data" / "PrismaUI" / "views" / "TulliusWidgets" / "user-fonts";
}

std::string BuildUserFontsJson(const std::filesystem::path& gameRootPath, std::size_t* outFontCount)
{
    std::vector<Font> fonts;
    std::error_code ec;
    const auto root = GetUserFontsDirectory(gameRootPath);
    for (fs::directory_iterator it(root, ec), end; it != end; it.increment(ec)) {
        try {
            if (!it->is_directory()) continue;
            const auto folderName = it->path().filename();
            auto id = ToUtf8(folderName);
            if (!IsValidName(id)) {
                logger::warn("Unsupported user font folder name: {}", id);
                continue;
            }
            auto files = CollectFontFiles(it->path(), id);
            if (files.empty()) continue;
            fonts.push_back({ std::move(id), LowercaseFolderName(folderName), std::move(files) });
        } catch (const std::exception& error) {
            logger::warn("Could not inspect a user font folder: {}", error.what());
        }
    }
    if (ec && ec != std::errc::no_such_file_or_directory) {
        logger::warn("Could not list user font folders: {}", ec.message());
    }

    std::sort(fonts.begin(), fonts.end(), [](const Font& left, const Font& right) {
        if (left.foldedId != right.foldedId) return left.foldedId < right.foldedId;
        return left.id < right.id;
    });
    fonts.erase(std::unique(fonts.begin(), fonts.end(), [](const Font& left, const Font& right) {
        return left.foldedId == right.foldedId;
    }), fonts.end());
    if (fonts.size() > kMaxFonts) {
        for (std::size_t i = kMaxFonts; i < fonts.size(); ++i) {
            logger::warn("User font folder limit reached, skipping {}", fonts[i].id);
        }
        fonts.resize(kMaxFonts);
    }

    std::string json = "{\"fonts\":[";
    for (std::size_t i = 0; i < fonts.size(); ++i) {
        if (i > 0) json += ',';
        json += "{\"id\":\"" + JsonUtils::Escape(fonts[i].id) + "\",\"files\":[";
        const auto& files = fonts[i].files;
        for (std::size_t j = 0; j < files.size(); ++j) {
            if (j > 0) json += ',';
            json += "\"" + JsonUtils::Escape(files[j]) + "\"";
        }
        json += "]}";
    }
    json += "]}";
    if (outFontCount) *outFontCount = fonts.size();
    return json;
}

}  // namespace TulliusWidgets::UserFonts

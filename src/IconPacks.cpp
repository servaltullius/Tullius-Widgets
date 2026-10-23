#include "IconPacks.h"

#include "JsonUtils.h"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <iterator>
#include <system_error>
#include <vector>

namespace TulliusWidgets::IconPacks {
namespace {

constexpr std::size_t kMaxPacks = 64;
constexpr std::size_t kMaxIconsPerPack = 512;
constexpr std::size_t kMaxIconNameLength = 48;
constexpr std::size_t kMaxPackIdBytes = 192;  // 64 characters of three-byte UTF-8
constexpr std::uintmax_t kMaxManifestBytes = 16 * 1024;

std::string ToUtf8(const std::filesystem::path& path)
{
    const auto u8 = path.u8string();
    return std::string(reinterpret_cast<const char*>(u8.data()), u8.size());
}

bool IsSafePackId(const std::string& id)
{
    if (id.empty() || id.size() > kMaxPackIdBytes || id.front() == '.' || id.find("..") != std::string::npos) {
        return false;
    }
    return std::none_of(id.begin(), id.end(), [](unsigned char c) {
        return c < 0x20 || c == '/' || c == '\\' || c == ':' || c == '"' || c == '%';
    });
}

bool IsSafeIconName(const std::string& name)
{
    return !name.empty() && name.size() <= kMaxIconNameLength &&
           std::all_of(name.begin(), name.end(), [](unsigned char c) {
               return std::isalnum(c) || c == '_' || c == '-';
           });
}

bool HasPngExtension(const std::filesystem::path& path)
{
    auto ext = ToUtf8(path.extension());
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return ext == ".png";
}

std::string ReadManifest(const std::filesystem::path& packDir)
{
    const auto manifestPath = packDir / "pack.json";
    std::error_code ec;
    const auto size = std::filesystem::file_size(manifestPath, ec);
    if (ec || size == 0 || size > kMaxManifestBytes) return {};
    std::ifstream file(manifestPath, std::ios::binary);
    if (!file) return {};
    return std::string(std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>());
}

}  // namespace

std::filesystem::path GetIconPacksDirectory(const std::filesystem::path& gameRootPath)
{
    return gameRootPath / "Data" / "PrismaUI" / "views" / "TulliusWidgets" / "icon-packs";
}

std::string BuildIconPacksJson(const std::filesystem::path& gameRootPath, std::size_t* outPackCount)
{
    struct Pack {
        std::string id;
        std::vector<std::string> icons;
        std::string manifest;
    };
    std::vector<Pack> packs;

    std::error_code ec;
    const auto root = GetIconPacksDirectory(gameRootPath);
    for (std::filesystem::directory_iterator it(root, ec), end; !ec && it != end && packs.size() < kMaxPacks; it.increment(ec)) {
        std::error_code entryEc;
        if (!it->is_directory(entryEc) || entryEc) continue;
        Pack pack{ ToUtf8(it->path().filename()) };
        if (!IsSafePackId(pack.id)) continue;

        std::error_code fileEc;
        for (std::filesystem::directory_iterator file(it->path(), fileEc), fileEnd; !fileEc && file != fileEnd && pack.icons.size() < kMaxIconsPerPack; file.increment(fileEc)) {
            std::error_code typeEc;
            if (!file->is_regular_file(typeEc) || typeEc || !HasPngExtension(file->path())) continue;
            auto stem = ToUtf8(file->path().stem());
            if (IsSafeIconName(stem)) pack.icons.push_back(std::move(stem));
        }
        if (pack.icons.empty()) continue;
        std::sort(pack.icons.begin(), pack.icons.end());
        pack.manifest = ReadManifest(it->path());
        packs.push_back(std::move(pack));
    }

    std::string json = "{\"packs\":[";
    for (std::size_t i = 0; i < packs.size(); ++i) {
        if (i > 0) json += ',';
        json += "{\"id\":\"" + JsonUtils::Escape(packs[i].id) + "\",\"icons\":[";
        for (std::size_t j = 0; j < packs[i].icons.size(); ++j) {
            if (j > 0) json += ',';
            json += "\"" + JsonUtils::Escape(packs[i].icons[j]) + "\"";
        }
        json += "],\"manifest\":\"" + JsonUtils::Escape(packs[i].manifest) + "\"}";
    }
    json += "]}";
    if (outPackCount) *outPackCount = packs.size();
    return json;
}

}  // namespace TulliusWidgets::IconPacks

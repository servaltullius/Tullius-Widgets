-- set minimum xmake version
set_xmakever("2.8.2")

includes("lib/commonlibsse-ng")

set_project("TulliusWidgets")
set_version("1.1.8-rc.1")
set_license("MIT")

set_languages("c++23")
set_warnings("allextra")

set_policy("package.requires_lock", true)

add_rules("mode.release")
add_rules("plugin.vsxmake.autoupdate")

target("TulliusWidgets")
    add_deps("commonlibsse-ng")

    add_rules("commonlibsse-ng.plugin", {
        name = "TulliusWidgets",
        author = "kdw73",
        description = "Combat stats HUD widgets powered by Prisma UI"
    })

    add_files("src/**.cpp")
    add_headerfiles("src/**.h")
    add_includedirs("src")
    set_pcxxheader("src/pch.h")

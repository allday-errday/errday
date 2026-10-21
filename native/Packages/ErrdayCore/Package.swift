// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ErrdayCore",
    platforms: [.iOS(.v17), .macOS(.v14), .watchOS(.v10)],
    products: [.library(name: "ErrdayCore", targets: ["ErrdayCore"])],
    targets: [
        .target(name: "ErrdayCore"),
        .testTarget(name: "ErrdayCoreTests", dependencies: ["ErrdayCore"])
    ]
)

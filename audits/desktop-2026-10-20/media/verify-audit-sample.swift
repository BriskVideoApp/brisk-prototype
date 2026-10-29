import Foundation
import AVFoundation
import ImageIO
let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let asset = AVURLAsset(url: root.appendingPathComponent("brisk-audit-sample-2s.mov"))
let generator = AVAssetImageGenerator(asset: asset)
var actual = CMTime.zero
let image = try generator.copyCGImage(at: .zero, actualTime: &actual)
let target = root.appendingPathComponent("brisk-audit-sample-decoded-frame.png")
let destination = CGImageDestinationCreateWithURL(target as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Cannot save decoded frame") }
print("Decoded movie frame: \(image.width)x\(image.height), time \(CMTimeGetSeconds(actual))")

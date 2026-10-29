// Disposable audit-only sample. No Brisk application assets or records are modified.
import Foundation
import AVFoundation
import CoreVideo
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let outputURL = outputDirectory.appendingPathComponent("brisk-audit-sample-2s.mp4")
let previewURL = outputDirectory.appendingPathComponent("brisk-audit-sample-preview.png")
let width = 640
let height = 360
let framesPerSecond: Int32 = 24
let frameCount = 48
if FileManager.default.fileExists(atPath: outputURL.path) {
    fputs("Output already exists; refusing to overwrite audit evidence.\n", stderr)
    exit(2)
}
let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 350_000, AVVideoMaxKeyFrameIntervalKey: 24]
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
])
guard writer.canAdd(input) else { fatalError("The local encoder cannot add H.264 input.") }
writer.add(input)
guard writer.startWriting() else { fatalError("Cannot start writer: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)

func centredText(_ text: String, size: CGFloat, y: CGFloat, colour: CGColor, context: CGContext) {
    let font = CTFontCreateWithName("Helvetica-Bold" as CFString, size, nil)
    let attributes: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): colour
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attributes))
    let textWidth = CTLineGetTypographicBounds(line, nil, nil, nil)
    context.textPosition = CGPoint(x: (Double(width) - textWidth) / 2, y: y)
    CTLineDraw(line, context)
}

for frameIndex in 0..<frameCount {
    let waitStart = Date()
    while !input.isReadyForMoreMediaData {
        if writer.status == .failed || Date().timeIntervalSince(waitStart) > 10 {
            fatalError("Local encoder stopped accepting frames: \(String(describing: writer.error))")
        }
        Thread.sleep(forTimeInterval: 0.01)
    }
    var optionalBuffer: CVPixelBuffer?
    let result = CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ] as CFDictionary, &optionalBuffer)
    guard result == kCVReturnSuccess, let buffer = optionalBuffer else { fatalError("Cannot create video frame.") }
    CVPixelBufferLockBaseAddress(buffer, [])
    guard let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) else { fatalError("Cannot create drawing context.") }
    context.setFillColor(CGColor(red: 0.12, green: 0.18, blue: 0.23, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.setFillColor(CGColor(red: 0.62, green: 0.79, blue: 0.86, alpha: 1))
    context.fill(CGRect(x: 54, y: 80, width: 532, height: 3))
    centredText("AUDIT SAMPLE", size: 44, y: 186, colour: CGColor(gray: 1, alpha: 1), context: context)
    centredText("Disposable Brisk desktop review", size: 18, y: 143, colour: CGColor(gray: 0.84, alpha: 1), context: context)
    centredText("2 seconds  |  640 x 360  |  24 fps", size: 14, y: 108, colour: CGColor(gray: 0.70, alpha: 1), context: context)
    let progress = CGFloat(frameIndex + 1) / CGFloat(frameCount)
    context.setFillColor(CGColor(red: 0.62, green: 0.79, blue: 0.86, alpha: 1))
    context.fill(CGRect(x: 54, y: 67, width: 532 * progress, height: 5))
    if frameIndex == 0, let previewImage = context.makeImage(), let destination = CGImageDestinationCreateWithURL(previewURL as CFURL, UTType.png.identifier as CFString, 1, nil) {
        CGImageDestinationAddImage(destination, previewImage, nil)
        guard CGImageDestinationFinalize(destination) else { fatalError("Cannot save preview.") }
    }
    CVPixelBufferUnlockBaseAddress(buffer, [])
    guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(frameIndex), timescale: framesPerSecond)) else { fatalError("Cannot append frame: \(String(describing: writer.error))") }
}
input.markAsFinished()
writer.endSession(atSourceTime: CMTime(value: 2, timescale: 1))
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
guard done.wait(timeout: .now() + 20) == .success, writer.status == .completed else { fatalError("Cannot finish MP4: \(String(describing: writer.error))") }
let asset = AVURLAsset(url: outputURL)
let tracks = asset.tracks(withMediaType: .video)
print("Created \(outputURL.path)")
print("Duration: \(CMTimeGetSeconds(asset.duration))s; video tracks: \(tracks.count); size: \(tracks.first?.naturalSize ?? .zero)")

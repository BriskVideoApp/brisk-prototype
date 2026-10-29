// Audit-only Motion JPEG MOV fallback, assembled from local ImageIO-compressed frames.
import Foundation
import AVFoundation
import CoreMedia
import CoreGraphics
import CoreText
import ImageIO

let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let output = directory.appendingPathComponent("brisk-audit-sample-2s.mov")
if FileManager.default.fileExists(atPath: output.path) { exit(2) }
let width = 640, height = 360
var description: CMVideoFormatDescription?
guard CMVideoFormatDescriptionCreate(allocator: kCFAllocatorDefault, codecType: kCMVideoCodecType_JPEG, width: Int32(width), height: Int32(height), extensions: nil, formatDescriptionOut: &description) == noErr, let format = description else { fatalError("JPEG video format unavailable") }
let writer = try AVAssetWriter(outputURL: output, fileType: .mov)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: nil, sourceFormatHint: format)
input.expectsMediaDataInRealTime = false
writer.add(input)
guard writer.startWriting() else { fatalError("Cannot start MOV writer: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)
for index in 0..<48 {
    let started = Date()
    while !input.isReadyForMoreMediaData {
        if Date().timeIntervalSince(started) > 10 { fatalError("MOV writer timed out") }
        Thread.sleep(forTimeInterval: 0.01)
    }
    guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("No graphics context") }
    context.setFillColor(CGColor(red: 0.12, green: 0.18, blue: 0.23, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    for (text, size, y) in [("AUDIT SAMPLE", CGFloat(44), CGFloat(188)), ("Disposable Brisk desktop review", CGFloat(18), CGFloat(144)), ("2 seconds | 640 x 360 | 24 fps", CGFloat(14), CGFloat(108))] {
        let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName("Helvetica-Bold" as CFString, size, nil), NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(gray: 1, alpha: 1)]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attrs))
        context.textPosition = CGPoint(x: (CGFloat(width) - CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))) / 2, y: y)
        CTLineDraw(line, context)
    }
    context.setFillColor(CGColor(red: 0.62, green: 0.79, blue: 0.86, alpha: 1))
    context.fill(CGRect(x: 54, y: 68, width: 532 * Double(index + 1) / 48, height: 5))
    guard let image = context.makeImage() else { fatalError("No frame image") }
    if index == 0, let png = CGImageDestinationCreateWithURL(directory.appendingPathComponent("brisk-audit-sample-preview.png") as CFURL, "public.png" as CFString, 1, nil) {
        CGImageDestinationAddImage(png, image, nil)
        CGImageDestinationFinalize(png)
    }
    let data = NSMutableData()
    guard let jpeg = CGImageDestinationCreateWithData(data as CFMutableData, "public.jpeg" as CFString, 1, nil) else { fatalError("No JPEG writer") }
    CGImageDestinationAddImage(jpeg, image, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
    guard CGImageDestinationFinalize(jpeg) else { fatalError("Cannot compress JPEG") }
    var block: CMBlockBuffer?
    guard CMBlockBufferCreateWithMemoryBlock(allocator: kCFAllocatorDefault, memoryBlock: nil, blockLength: data.length, blockAllocator: kCFAllocatorDefault, customBlockSource: nil, offsetToData: 0, dataLength: data.length, flags: 0, blockBufferOut: &block) == kCMBlockBufferNoErr, let bytes = block else { fatalError("No media block") }
    guard CMBlockBufferReplaceDataBytes(with: data.bytes, blockBuffer: bytes, offsetIntoDestination: 0, dataLength: data.length) == kCMBlockBufferNoErr else { fatalError("Cannot fill media block") }
    var timing = CMSampleTimingInfo(duration: CMTime(value: 1, timescale: 24), presentationTimeStamp: CMTime(value: Int64(index), timescale: 24), decodeTimeStamp: .invalid)
    var size = data.length
    var sample: CMSampleBuffer?
    guard CMSampleBufferCreateReady(allocator: kCFAllocatorDefault, dataBuffer: bytes, formatDescription: format, sampleCount: 1, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleSizeEntryCount: 1, sampleSizeArray: &size, sampleBufferOut: &sample) == noErr, let frame = sample else { fatalError("No sample buffer") }
    guard input.append(frame) else { fatalError("Cannot append compressed sample: \(String(describing: writer.error))") }
}
input.markAsFinished()
writer.endSession(atSourceTime: CMTime(value: 2, timescale: 1))
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
guard done.wait(timeout: .now() + 20) == .success, writer.status == .completed else { fatalError("MOV not completed: \(String(describing: writer.error))") }
let asset = AVURLAsset(url: output)
print("Created \(output.path)")
print("Duration: \(CMTimeGetSeconds(asset.duration)) seconds; tracks: \(asset.tracks(withMediaType: .video).count)")

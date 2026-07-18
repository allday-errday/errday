import Capacitor
import UIKit
import WebKit

final class ErrdayBridgeViewController: CAPBridgeViewController {
    private let appBackground = UIColor(red: 21 / 255, green: 23 / 255, blue: 28 / 255, alpha: 1)

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        view.backgroundColor = appBackground
        webView?.backgroundColor = appBackground
        webView?.isOpaque = false
        webView?.scrollView.backgroundColor = appBackground
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.bounces = false
        webView?.scrollView.isDirectionalLockEnabled = true
        webView?.scrollView.showsHorizontalScrollIndicator = false
        webView?.configuration.userContentController.addUserScript(
            WKUserScript(
                source: nativeChromeFallbackScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        syncSafeAreaInset()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        syncSafeAreaInset()
    }

    private func syncSafeAreaInset() {
        let inset = view.safeAreaInsets.top
        webView?.evaluateJavaScript(
            "document.documentElement.style.setProperty('--errday-native-safe-top', '\(inset)px');"
        )
    }

    private let nativeChromeFallbackScript = """
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.overflowX = 'hidden';
      document.body.style.overflowX = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      var shell = document.querySelector('body > div:not([hidden]):not([data-errday-shell])');
      if (shell) {
        shell.style.paddingTop = 'var(--errday-native-safe-top, env(safe-area-inset-top))';
      }
    });
    """
}

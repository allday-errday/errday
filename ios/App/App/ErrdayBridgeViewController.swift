import Capacitor
import UIKit
import WebKit

final class ErrdayBridgeViewController: CAPBridgeViewController {
    private let appBackground = UIColor(red: 21 / 255, green: 23 / 255, blue: 28 / 255, alpha: 1)
    private var loadingOverlay: UIView?
    private var loadingLabel: UILabel?
    private var retryButton: UIButton?
    private var loadingObservation: NSKeyValueObservation?
    private var loadingTimeout: DispatchWorkItem?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        view.backgroundColor = appBackground
        webView?.backgroundColor = appBackground
        webView?.isOpaque = true
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
        showLoadingOverlay()
        observeWebViewLoading()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        syncSafeAreaInset()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        syncSafeAreaInset()
        if webView?.isLoading != false {
            showLoadingOverlay()
            if let loadingOverlay {
                view.bringSubviewToFront(loadingOverlay)
            }
        }
    }

    private func syncSafeAreaInset() {
        let inset = view.safeAreaInsets.top
        webView?.evaluateJavaScript(
            "document.documentElement.style.setProperty('--errday-native-safe-top', '\(inset)px');"
        )
    }

    private func observeWebViewLoading() {
        loadingObservation = webView?.observe(\.isLoading, options: [.initial, .new]) { [weak self] webView, _ in
            guard let self else { return }
            DispatchQueue.main.async {
                if webView.isLoading {
                    self.showLoadingOverlay()
                    if let loadingOverlay = self.loadingOverlay {
                        self.view.bringSubviewToFront(loadingOverlay)
                    }
                    self.scheduleLoadingTimeout()
                } else {
                    self.hideLoadingOverlay()
                }
            }
        }
    }

    private func showLoadingOverlay() {
        guard loadingOverlay == nil else {
            loadingOverlay?.isHidden = false
            return
        }

        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = appBackground

        let title = UILabel()
        title.translatesAutoresizingMaskIntoConstraints = false
        title.text = "errday."
        title.font = .systemFont(ofSize: 30, weight: .bold)
        title.textColor = .white

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Loading your day..."
        label.font = .systemFont(ofSize: 15, weight: .medium)
        label.textColor = UIColor(white: 0.68, alpha: 1)

        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.isHidden = true
        button.setTitle("Try again", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        button.tintColor = appBackground
        button.backgroundColor = UIColor(red: 139 / 255, green: 130 / 255, blue: 246 / 255, alpha: 1)
        button.layer.cornerRadius = 12
        button.addTarget(self, action: #selector(retryLoading), for: .touchUpInside)

        overlay.addSubview(title)
        overlay.addSubview(label)
        overlay.addSubview(button)
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            title.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            title.centerYAnchor.constraint(equalTo: overlay.centerYAnchor, constant: -24),
            label.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 12),
            label.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            button.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 22),
            button.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            button.widthAnchor.constraint(greaterThanOrEqualToConstant: 132),
            button.heightAnchor.constraint(equalToConstant: 48),
        ])

        loadingOverlay = overlay
        loadingLabel = label
        retryButton = button
    }

    private func hideLoadingOverlay() {
        loadingTimeout?.cancel()
        loadingTimeout = nil
        guard let loadingOverlay else { return }
        UIView.animate(withDuration: 0.2, animations: {
            loadingOverlay.alpha = 0
        }, completion: { _ in
            loadingOverlay.removeFromSuperview()
            self.loadingOverlay = nil
            self.loadingLabel = nil
            self.retryButton = nil
        })
    }

    private func scheduleLoadingTimeout() {
        guard loadingTimeout == nil else { return }
        let timeout = DispatchWorkItem { [weak self] in
            self?.loadingLabel?.text = "Errday could not connect."
            self?.retryButton?.isHidden = false
            self?.loadingTimeout = nil
        }
        loadingTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 12, execute: timeout)
    }

    @objc private func retryLoading() {
        retryButton?.isHidden = true
        loadingLabel?.text = "Loading your day..."
        webView?.reload()
        scheduleLoadingTimeout()
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

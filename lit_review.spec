# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — Lit Review Agent v2
# Build:
#   macOS: pyinstaller lit_review.spec --noconfirm
#   Windows: pyinstaller lit_review.spec --noconfirm  (run on Windows)

import sys
from pathlib import Path

ROOT = Path(SPECPATH)

a = Analysis(
    [str(ROOT / "serve.py")],
    pathex=[str(ROOT), str(ROOT / "backend")],
    binaries=[],
    datas=[
        # Bundle the entire app package
        (str(ROOT / "backend" / "app"), "app"),
        # .env.example so users know what to create
        (str(ROOT / ".env.example"), "."),
    ],
    hiddenimports=[
        # PyQt6
        "PyQt6",
        "PyQt6.QtWidgets",
        "PyQt6.QtCore",
        "PyQt6.QtGui",
        # Anthropic SDK
        "anthropic",
        "httpx",
        # ChromaDB
        "chromadb",
        "chromadb.api",
        "chromadb.api.models",
        "chromadb.db",
        "chromadb.segment",
        "chromadb.telemetry",
        # Sentence Transformers / SPECTER
        "sentence_transformers",
        "sentence_transformers.models",
        "transformers",
        "torch",
        "torch.nn",
        # Docling
        "docling",
        "docling.document_converter",
        "docling.datamodel",
        "docling.datamodel.pipeline_options",
        "docling.datamodel.document",
        # Pydantic
        "pydantic",
        "pydantic_settings",
        # Other
        "pandas",
        "tenacity",
        "tabulate",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Remove large unused packages to shrink bundle
        "torchvision",
        "torchaudio",
        "tkinter",
        "_tkinter",
        "matplotlib",
        "IPython",
        "jupyter",
        "notebook",
        "unittest",
        "xmlrpc",
        "email",
        "html",
        "http.server",
        "ftplib",
        "imaplib",
        "poplib",
        "smtplib",
        "telnetlib",
        "nntplib",
        "fastapi",
        "uvicorn",
        "starlette",
        "httpx._config",
        "pytest",
        "setuptools",
        "docutils",
    ],
    noarchive=False,
    optimize=1,
)

pyz = PYZ(a.pure)

# ── Platform-specific output ───────────────────────────────────────────────────

if sys.platform == "darwin":
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name="Lit Review Agent",
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=False,          # UPX can break torch/chromadb on macOS
        console=False,      # No terminal window
        disable_windowed_traceback=False,
        target_arch=None,   # None = current arch; use "x86_64" or "arm64" to force
        codesign_identity=None,
        entitlements_file=None,
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.datas,
        strip=False,
        upx=False,
        upx_exclude=[],
        name="Lit Review Agent",
    )
    app = BUNDLE(
        coll,
        name="Lit Review Agent.app",
        icon=None,          # set to 'gui/assets/icon.icns' if you add one
        bundle_identifier="edu.usc.litreview",
        version="2.0.0",
        info_plist={
            "CFBundleName": "Lit Review Agent",
            "CFBundleDisplayName": "Lit Review Agent",
            "CFBundleVersion": "2.0.0",
            "CFBundleShortVersionString": "2.0",
            "NSHighResolutionCapable": True,
            "LSMinimumSystemVersion": "12.0",
        },
    )

else:
    # Windows — single-directory bundle (use --onefile for a single .exe)
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.datas,
        [],
        name="LitReviewAgent",
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        upx_exclude=["vcruntime140.dll"],
        runtime_tmpdir=None,
        console=False,      # No console window on Windows
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon=None,          # set to 'gui/assets/icon.ico' if you add one
    )

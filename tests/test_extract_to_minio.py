from __future__ import annotations

from pathlib import Path

import extract_to_minio


def test_get_file_md5(tmp_path):
    target = tmp_path / "example.txt"
    target.write_text("hello world")

    digest = extract_to_minio.get_file_md5(target)
    # precomputed MD5 for "hello world"
    assert digest == "5eb63bbbe01eeed093cb22bb8f5acdc3"

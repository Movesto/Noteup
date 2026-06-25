from app.utils.link_parser import extract_links


def test_extracts_single_link():
    assert extract_links("see [[Alpha]] for more") == ["Alpha"]


def test_extracts_multiple_links_in_order():
    assert extract_links("[[Alpha]] then [[Beta]]") == ["Alpha", "Beta"]


def test_ignores_text_without_links():
    assert extract_links("no links here") == []


def test_ignores_empty_and_unclosed_brackets():
    assert extract_links("[[]]") == []
    assert extract_links("[[Alpha") == []
    assert extract_links("Alpha]]") == []


def test_non_greedy_match():
    # Two adjacent links should not merge into one.
    assert extract_links("[[A]][[B]]") == ["A", "B"]


def test_trims_surrounding_whitespace():
    # [[ Philosophy ]] must resolve to the note titled "Philosophy".
    assert extract_links("see [[ Philosophy ]] here") == ["Philosophy"]
    assert extract_links("[[الفلسفة ]]") == ["الفلسفة"]


def test_whitespace_only_target_dropped():
    assert extract_links("[[   ]]") == []

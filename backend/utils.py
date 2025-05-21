import math
from number_words import number_words

def get_number_words(lang):
    """Get number words dictionary for specified language."""
    if lang not in number_words:
        raise ValueError(f"Language {lang} not supported!")
    return number_words[lang]

def spellNumber0to99(num, lang):
    if num < 0 or num > 99:
        raise ValueError("number out of range!")

    words = get_number_words(lang)
    
    if num < 10:
        return words["0to9"][num]
    elif num >= 10 and num < 20:
        return words["10to19"][num]
    elif num >= 20 and num < 100:
        num1 = math.floor(num / 10)
        num2 = num % 10
        if num2 == 0:
            return words["20to90"][num1]
        else:
            return f"{words['0to9'][num2]} {lang == 'hsb' and 'a' or 'und'} {words['20to90'][num1]}"

def spellNumber100to999(num, lang):
    if num < 100 or num > 999:
        raise ValueError("number out of range!")

    words = get_number_words(lang)
    num1 = math.floor(num / 100)
    num2 = num % 100

    if num2 == 0:
        return words["100to900"][num1]
    else:
        return f"{words['100to900'][num1]} {spellNumber0to99(num2, lang)}"

def spellNumber0to999(num, lang):
    if num < 0 or num > 999:
        raise ValueError("number out of range!")

    if num < 100:
        return spellNumber0to99(num, lang)
    else:
        return spellNumber100to999(num, lang)

def spellNumber1000to999999(num, lang):
    words = get_number_words(lang)
    texts = []

    num1 = math.floor(num / 1e3)
    num2 = num % 1e3

    if num1 > 0:
        if num1 != 1:
            texts.append(spellNumber0to999(num1, lang))
        texts.append(words["1000plus"][1e3])
    if num2 > 0:
        texts.append(spellNumber0to999(num2, lang))
    return " ".join(texts)

def spellNumberMil(num, lang):
    words = get_number_words(lang)
    texts = []
    num1 = math.floor(num / 1e6)
    num2 = num % 1e6

    if num1 > 0:
        if num1 == 1:
            texts.append(words["1000plus"][1e6])
        elif num1 == 2:
            texts.append(words["1000plus"][2e6])
        elif num1 == 3:
            texts.append(words["1000plus"][3e6])
        elif num1 == 4:
            texts.append(words["1000plus"][4e6])
        elif num1 == 5:
            texts.append(words["1000plus"][5e6])
        else:
            texts.append(spellNumber0to999(num1, lang))
            texts.append(words["1000plus"]["6e6+"])

    if num2 > 0:
        texts.append(spellNumber1000to999999(num2, lang))
    return " ".join(texts)

def spellNumberMrd(num, lang):
    words = get_number_words(lang)
    texts = []
    num1 = math.floor(num / 1e9)
    num2 = num % 1e9

    if num1 > 0:
        if num1 == 1:
            texts.append(words["1000plus"][1e9])
        elif num1 == 2:
            texts.append(words["1000plus"][2e9])
        elif num1 == 3:
            texts.append(words["1000plus"][3e9])
        elif num1 == 4:
            texts.append(words["1000plus"][4e9])
        elif num1 == 5:
            texts.append(words["1000plus"][5e9])
        else:
            texts.append(spellNumber0to999(num1, lang))
            texts.append(words["1000plus"]["6e9+"])

    if num2 > 0:
        texts.append(spellNumberMil(num2, lang))
    return " ".join(texts)

def spellNumberBil(num, lang):
    words = get_number_words(lang)
    texts = []
    num1 = math.floor(num / 1e12)
    num2 = num % 1e12

    if num1 > 0:
        if num1 == 1:
            texts.append(words["1000plus"][1e12])
        elif num1 == 2:
            texts.append(words["1000plus"][2e12])
        elif num1 == 3:
            texts.append(words["1000plus"][3e12])
        elif num1 == 4:
            texts.append(words["1000plus"][4e12])
        elif num1 == 5:
            texts.append(words["1000plus"][5e12])
        else:
            texts.append(spellNumber0to999(num1, lang))
            texts.append(words["1000plus"]["6e12+"])

    if num2 > 0:
        texts.append(spellNumberMrd(num2, lang))
    return " ".join(texts)

def year_to_text(num, lang):
    num = int(num)
    if lang not in ["hsb", "de"]:
        raise ValueError("language not supported!")
    
    if num > 1099 and num < 2000:
        num1 = math.floor(num / 100)
        num1_txt = spellNumber0to99(num1, lang)
        num2 = num % 100
        num2_txt = spellNumber0to99(num2, lang)
        return f"{num1_txt} stow {num2_txt}" if lang == "hsb" else f"{num1_txt} hundert {num2_txt}"
    else:
        return number_to_text(num, lang)

def number_to_text(num, lang):
    try:
        int(num)
    except ValueError:
        raise ValueError("not a number!")

    num = int(num)

    if num >= 0 and num < 1000:
        return spellNumber0to999(num, lang)
    elif num >= 1e3 and num < 1e6:
        return spellNumber1000to999999(num, lang)
    elif num >= 1e6 and num < 1e9:
        return spellNumberMil(num, lang)
    elif num >= 1e9 and num < 1e12:
        return spellNumberMrd(num, lang)
    elif num >= 1e12 and num < 1e15:
        return spellNumberBil(num, lang)
    else:
        raise ValueError("number out of range!")

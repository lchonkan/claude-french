-- Seed data: A1 French grammar lessons
-- 3 lessons covering regular -er verbs, articles, and basic adjectives
-- Each lesson has 5-8 exercises of varying types

-- ============================================================================
-- Lesson 1: Regular -er verbs (parler, manger, aimer)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-gram-0001-0001-000000000001',
  'grammar',
  'A1',
  'Presente de los verbos regulares en -er',
  'Le present des verbes reguliers en -er',
  'Aprende a conjugar los verbos regulares que terminan en -er como parler, manger y aimer. Estos verbos siguen un patron predecible que te permitira conjugar cientos de verbos en frances.',
  '{
    "explanation_es": "En frances, los verbos regulares en -er son los mas comunes. Para conjugarlos en presente, se quita la terminacion -er y se anaden las terminaciones: -e, -es, -e, -ons, -ez, -ent.\n\nEjemplo con ''parler'' (hablar):\n- Je parle (yo hablo)\n- Tu parles (tu hablas)\n- Il/Elle parle (el/ella habla)\n- Nous parlons (nosotros hablamos)\n- Vous parlez (ustedes hablan)\n- Ils/Elles parlent (ellos/ellas hablan)\n\nNota: Las terminaciones -e, -es, -e y -ent son mudas (no se pronuncian). Solo -ons y -ez se pronuncian claramente.",
    "examples": [
      {"fr": "Je parle francais.", "es": "Yo hablo frances."},
      {"fr": "Tu manges une pomme.", "es": "Tu comes una manzana."},
      {"fr": "Elle aime la musique.", "es": "A ella le gusta la musica."},
      {"fr": "Nous parlons ensemble.", "es": "Nosotros hablamos juntos."},
      {"fr": "Vous mangez au restaurant.", "es": "Ustedes comen en el restaurante."},
      {"fr": "Ils aiment le cinema.", "es": "A ellos les gusta el cine."}
    ],
    "grammar_table": {
      "verb": "parler",
      "conjugations": {
        "je": "parle",
        "tu": "parles",
        "il/elle": "parle",
        "nous": "parlons",
        "vous": "parlez",
        "ils/elles": "parlent"
      }
    },
    "notes_es": "Recuerda: ''manger'' tiene una particularidad: en la forma ''nous'', se escribe ''mangeons'' (con una e extra) para mantener el sonido suave de la g."
  }',
  1
);

-- Exercises for Lesson 1
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-exer-0001-0001-000000000001',
  'a1000001-gram-0001-0001-000000000001',
  'fill_blank',
  'Completa con la forma correcta del verbo ''parler''.',
  '{
    "sentence": "Je ___ francais tous les jours.",
    "correct_answer": "parle",
    "options": ["parle", "parles", "parlons", "parlez"],
    "hint": "''Je'' usa la primera persona singular."
  }',
  1, 1
),
(
  'a1000001-exer-0001-0002-000000000002',
  'a1000001-gram-0001-0001-000000000001',
  'fill_blank',
  'Completa con la forma correcta del verbo ''manger''.',
  '{
    "sentence": "Nous ___ au restaurant ce soir.",
    "correct_answer": "mangeons",
    "options": ["mangons", "mangeons", "mangez", "mangent"],
    "hint": "Con ''nous'', ''manger'' necesita una ''e'' extra antes de ''-ons''."
  }',
  2, 2
),
(
  'a1000001-exer-0001-0003-000000000003',
  'a1000001-gram-0001-0001-000000000001',
  'conjugate',
  'Conjuga el verbo ''aimer'' (gustar/amar) en presente para todos los pronombres.',
  '{
    "verb": "aimer",
    "translation": "gustar / amar",
    "expected": {
      "je": "aime",
      "tu": "aimes",
      "il/elle": "aime",
      "nous": "aimons",
      "vous": "aimez",
      "ils/elles": "aiment"
    }
  }',
  1, 3
),
(
  'a1000001-exer-0001-0004-000000000004',
  'a1000001-gram-0001-0001-000000000001',
  'multiple_choice',
  'Cual es la conjugacion correcta? "Tu ___ une pizza."',
  '{
    "sentence": "Tu ___ une pizza.",
    "verb": "manger",
    "correct_answer": "manges",
    "options": ["mange", "manges", "mangez", "mangeons"],
    "explanation_es": "Con ''tu'', los verbos en -er terminan en ''-es'': tu manges."
  }',
  1, 4
),
(
  'a1000001-exer-0001-0005-000000000005',
  'a1000001-gram-0001-0001-000000000001',
  'error_correct',
  'Encuentra y corrige el error en la oracion.',
  '{
    "sentence": "Ils parle francais a la maison.",
    "error_word": "parle",
    "correct_word": "parlent",
    "error_position": 1,
    "explanation_es": "Con ''ils'' (ellos), el verbo necesita la terminacion ''-ent'': parlent."
  }',
  2, 5
),
(
  'a1000001-exer-0001-0006-000000000006',
  'a1000001-gram-0001-0001-000000000001',
  'fill_blank',
  'Completa con la forma correcta del verbo ''parler''.',
  '{
    "sentence": "Vous ___ espagnol et francais.",
    "correct_answer": "parlez",
    "options": ["parle", "parles", "parlons", "parlez"],
    "hint": "''Vous'' siempre usa la terminacion ''-ez''."
  }',
  1, 6
),
(
  'a1000001-exer-0001-0007-000000000007',
  'a1000001-gram-0001-0001-000000000001',
  'conjugate',
  'Conjuga el verbo ''parler'' (hablar) en presente para todos los pronombres.',
  '{
    "verb": "parler",
    "translation": "hablar",
    "expected": {
      "je": "parle",
      "tu": "parles",
      "il/elle": "parle",
      "nous": "parlons",
      "vous": "parlez",
      "ils/elles": "parlent"
    }
  }',
  2, 7
),
(
  'a1000001-exer-0001-0008-000000000008',
  'a1000001-gram-0001-0001-000000000001',
  'error_correct',
  'Encuentra y corrige el error en la oracion.',
  '{
    "sentence": "Nous mangons du pain.",
    "error_word": "mangons",
    "correct_word": "mangeons",
    "error_position": 1,
    "explanation_es": "Con ''manger'' y ''nous'', se anade una ''e'' antes de ''-ons'' para mantener el sonido suave: mangeons."
  }',
  2, 8
);

-- ============================================================================
-- Lesson 2: Articles (le/la/les/un/une/des)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-gram-0002-0001-000000000002',
  'grammar',
  'A1',
  'Los articulos definidos e indefinidos',
  'Les articles definis et indefinis',
  'Aprende a usar los articulos en frances: le, la, les (definidos) y un, une, des (indefinidos). El genero de los sustantivos determina cual articulo usar.',
  '{
    "explanation_es": "En frances hay dos tipos de articulos:\n\nArticulos definidos (el, la, los/las):\n- le: masculino singular (le livre = el libro)\n- la: femenino singular (la maison = la casa)\n- les: plural para ambos generos (les livres = los libros)\n- l'': se usa antes de vocal o h muda (l''ecole = la escuela)\n\nArticulos indefinidos (un, una, unos/unas):\n- un: masculino singular (un chat = un gato)\n- une: femenino singular (une table = una mesa)\n- des: plural para ambos generos (des amis = unos amigos)\n\nImportante: A diferencia del espanol, en frances SIEMPRE se usa un articulo delante del sustantivo.",
    "examples": [
      {"fr": "Le chat dort sur le canape.", "es": "El gato duerme en el sofa."},
      {"fr": "La fille mange une pomme.", "es": "La chica come una manzana."},
      {"fr": "Les enfants jouent dans le jardin.", "es": "Los ninos juegan en el jardin."},
      {"fr": "J''ai un livre et une carte.", "es": "Tengo un libro y una tarjeta."},
      {"fr": "Il y a des fleurs dans le vase.", "es": "Hay unas flores en el florero."},
      {"fr": "L''eau est froide.", "es": "El agua esta fria."}
    ],
    "grammar_table": {
      "definite": {"masculin": "le", "feminin": "la", "plural": "les", "vowel": "l''"},
      "indefinite": {"masculin": "un", "feminin": "une", "plural": "des"}
    },
    "notes_es": "Truco: En frances, los sustantivos terminados en -tion, -sion, -te son generalmente femeninos (similar al espanol). Los terminados en -ment, -age suelen ser masculinos."
  }',
  2
);

-- Exercises for Lesson 2
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-exer-0002-0001-000000000001',
  'a1000001-gram-0002-0001-000000000002',
  'fill_blank',
  'Elige el articulo definido correcto.',
  '{
    "sentence": "___ maison est grande.",
    "correct_answer": "La",
    "options": ["Le", "La", "Les", "Un"],
    "hint": "''Maison'' (casa) es femenino en frances."
  }',
  1, 1
),
(
  'a1000001-exer-0002-0002-000000000002',
  'a1000001-gram-0002-0001-000000000002',
  'fill_blank',
  'Elige el articulo definido correcto.',
  '{
    "sentence": "___ enfants jouent dans le parc.",
    "correct_answer": "Les",
    "options": ["Le", "La", "Les", "Des"],
    "hint": "''Enfants'' esta en plural."
  }',
  1, 2
),
(
  'a1000001-exer-0002-0003-000000000003',
  'a1000001-gram-0002-0001-000000000002',
  'multiple_choice',
  'Cual es el articulo correcto para "ecole" (escuela)?',
  '{
    "sentence": "Je vais a ___ ecole.",
    "correct_answer": "l''",
    "options": ["le", "la", "l''", "les"],
    "explanation_es": "Antes de una vocal se usa ''l'''': l''ecole. ''Ecole'' es femenino pero empieza por vocal."
  }',
  2, 3
),
(
  'a1000001-exer-0002-0004-000000000004',
  'a1000001-gram-0002-0001-000000000002',
  'fill_blank',
  'Completa con el articulo indefinido correcto.',
  '{
    "sentence": "J''ai ___ chat noir.",
    "correct_answer": "un",
    "options": ["un", "une", "des", "le"],
    "hint": "''Chat'' (gato) es masculino."
  }',
  1, 4
),
(
  'a1000001-exer-0002-0005-000000000005',
  'a1000001-gram-0002-0001-000000000002',
  'error_correct',
  'Encuentra y corrige el error del articulo.',
  '{
    "sentence": "Le fleur est rouge.",
    "error_word": "Le",
    "correct_word": "La",
    "error_position": 0,
    "explanation_es": "''Fleur'' (flor) es femenino en frances, asi que el articulo correcto es ''la'': La fleur."
  }',
  2, 5
),
(
  'a1000001-exer-0002-0006-000000000006',
  'a1000001-gram-0002-0001-000000000002',
  'multiple_choice',
  'Cual es la frase correcta?',
  '{
    "question": "Cual de estas frases usa los articulos correctamente?",
    "correct_answer": "J''ai une voiture et un velo.",
    "options": [
      "J''ai un voiture et une velo.",
      "J''ai une voiture et un velo.",
      "J''ai le voiture et la velo.",
      "J''ai des voiture et des velo."
    ],
    "explanation_es": "''Voiture'' (coche) es femenino (une voiture) y ''velo'' (bicicleta) es masculino (un velo)."
  }',
  2, 6
),
(
  'a1000001-exer-0002-0007-000000000007',
  'a1000001-gram-0002-0001-000000000002',
  'fill_blank',
  'Completa con el articulo indefinido plural.',
  '{
    "sentence": "Il y a ___ livres sur la table.",
    "correct_answer": "des",
    "options": ["un", "une", "des", "les"],
    "hint": "''Livres'' esta en plural y no es un libro especifico."
  }',
  1, 7
);

-- ============================================================================
-- Lesson 3: Basic adjectives (grand/petit, bon/mauvais)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-gram-0003-0001-000000000003',
  'grammar',
  'A1',
  'Adjetivos basicos: grande/pequeno, bueno/malo',
  'Adjectifs de base : grand/petit, bon/mauvais',
  'Aprende a usar los adjetivos mas comunes en frances. Descubre como los adjetivos cambian segun el genero (masculino/femenino) y el numero (singular/plural) del sustantivo.',
  '{
    "explanation_es": "En frances, los adjetivos concuerdan en genero y numero con el sustantivo:\n\nGrand / Petit:\n- grand (m.s.), grande (f.s.), grands (m.p.), grandes (f.p.)\n- petit (m.s.), petite (f.s.), petits (m.p.), petites (f.p.)\n\nBon / Mauvais:\n- bon (m.s.), bonne (f.s.), bons (m.p.), bonnes (f.p.)\n- mauvais (m.s.), mauvaise (f.s.), mauvais (m.p.), mauvaises (f.p.)\n\nPosicion: Estos adjetivos frecuentes van ANTES del sustantivo (a diferencia de la mayoria de adjetivos en frances):\n- un grand homme (un hombre grande)\n- une petite maison (una casa pequena)\n- un bon repas (una buena comida)",
    "examples": [
      {"fr": "C''est un grand jardin.", "es": "Es un jardin grande."},
      {"fr": "J''ai une petite voiture.", "es": "Tengo un coche pequeno."},
      {"fr": "C''est un bon restaurant.", "es": "Es un buen restaurante."},
      {"fr": "Il fait mauvais temps.", "es": "Hace mal tiempo."},
      {"fr": "Les grandes villes sont bruyantes.", "es": "Las grandes ciudades son ruidosas."},
      {"fr": "Ce sont de bonnes nouvelles.", "es": "Son buenas noticias."}
    ],
    "grammar_table": {
      "grand": {"ms": "grand", "fs": "grande", "mp": "grands", "fp": "grandes"},
      "petit": {"ms": "petit", "fs": "petite", "mp": "petits", "fp": "petites"},
      "bon": {"ms": "bon", "fs": "bonne", "mp": "bons", "fp": "bonnes"},
      "mauvais": {"ms": "mauvais", "fs": "mauvaise", "mp": "mauvais", "fp": "mauvaises"}
    },
    "notes_es": "Atencion: ''mauvais'' no cambia en masculino plural (mauvais -> mauvais). Esto es porque ya termina en ''s''."
  }',
  3
);

-- Exercises for Lesson 3
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-exer-0003-0001-000000000001',
  'a1000001-gram-0003-0001-000000000003',
  'fill_blank',
  'Elige la forma correcta del adjetivo.',
  '{
    "sentence": "C''est une ___ maison.",
    "correct_answer": "grande",
    "options": ["grand", "grande", "grands", "grandes"],
    "hint": "''Maison'' es femenino singular."
  }',
  1, 1
),
(
  'a1000001-exer-0003-0002-000000000002',
  'a1000001-gram-0003-0001-000000000003',
  'fill_blank',
  'Elige la forma correcta del adjetivo.',
  '{
    "sentence": "Les ___ chats dorment.",
    "correct_answer": "petits",
    "options": ["petit", "petite", "petits", "petites"],
    "hint": "''Chats'' es masculino plural."
  }',
  1, 2
),
(
  'a1000001-exer-0003-0003-000000000003',
  'a1000001-gram-0003-0001-000000000003',
  'multiple_choice',
  'Cual es la forma femenina de "bon"?',
  '{
    "question": "Cual es la forma correcta de ''bon'' para un sustantivo femenino singular?",
    "correct_answer": "bonne",
    "options": ["bon", "bonne", "bons", "bonnes"],
    "explanation_es": "La forma femenina de ''bon'' es ''bonne'' (con doble n): une bonne idee."
  }',
  1, 3
),
(
  'a1000001-exer-0003-0004-000000000004',
  'a1000001-gram-0003-0001-000000000003',
  'error_correct',
  'Encuentra y corrige el error del adjetivo.',
  '{
    "sentence": "C''est une bon idee.",
    "error_word": "bon",
    "correct_word": "bonne",
    "error_position": 2,
    "explanation_es": "''Idee'' es femenino, asi que necesitas la forma femenina: ''bonne idee''."
  }',
  2, 4
),
(
  'a1000001-exer-0003-0005-000000000005',
  'a1000001-gram-0003-0001-000000000003',
  'fill_blank',
  'Completa con la forma correcta de ''mauvais''.',
  '{
    "sentence": "C''est une ___ journee.",
    "correct_answer": "mauvaise",
    "options": ["mauvais", "mauvaise", "mauvaises", "mauvois"],
    "hint": "''Journee'' es femenino singular."
  }',
  2, 5
),
(
  'a1000001-exer-0003-0006-000000000006',
  'a1000001-gram-0003-0001-000000000003',
  'conjugate',
  'Escribe las cuatro formas del adjetivo ''grand'' (m.s., f.s., m.p., f.p.).',
  '{
    "verb": "grand",
    "translation": "grande",
    "expected": {
      "masculin singulier": "grand",
      "feminin singulier": "grande",
      "masculin pluriel": "grands",
      "feminin pluriel": "grandes"
    }
  }',
  1, 6
),
(
  'a1000001-exer-0003-0007-000000000007',
  'a1000001-gram-0003-0001-000000000003',
  'error_correct',
  'Encuentra y corrige el error del adjetivo.',
  '{
    "sentence": "Les petit filles jouent.",
    "error_word": "petit",
    "correct_word": "petites",
    "error_position": 1,
    "explanation_es": "''Filles'' es femenino plural, asi que el adjetivo debe ser ''petites''."
  }',
  2, 7
),
(
  'a1000001-exer-0003-0008-000000000008',
  'a1000001-gram-0003-0001-000000000003',
  'multiple_choice',
  'Elige la oracion correcta.',
  '{
    "question": "Cual de estas oraciones tiene el adjetivo correcto?",
    "correct_answer": "Ce sont de bonnes nouvelles.",
    "options": [
      "Ce sont de bons nouvelles.",
      "Ce sont de bon nouvelles.",
      "Ce sont de bonnes nouvelles.",
      "Ce sont de bonne nouvelles."
    ],
    "explanation_es": "''Nouvelles'' es femenino plural, asi que se usa ''bonnes'' (f.p.)."
  }',
  2, 8
);

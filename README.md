# deeppavlov-chatbot

# Requirements

* `Python` (>=3.6)
* `Node` (>=v8)
* `Linux` or `Windows` (installation for `Windows` requires [git](https://git-scm.com/download/win) and `Visual Studio 2015/2017` with `C++ build tools` installed!)

# Installation

0. Clone this repository or [download](https://github.com/ehrhart/deeppavlov-chatbot/archive/master.zip) the latest version.

1. Create and activate a virtual environment:

    * `Linux`
    ```bash
    cd nlu
    python -m venv env
    source ./env/bin/activate
    ```
    * `Windows`
    ```bat
    cd nlu
    python -m venv env
    .\env\Scripts\activate.bat
    ```

2. Install the Python requirements:

    ```
    pip install -r requirements.txt
    ```

3. Download and install spacy en_core_web_sm:

    ```
    python -m spacy download en_core_web_sm
    ```

4. Now install the frontend dependencies:

    ```
    cd ../chatbot
    npm install
    ```

# Running the chatbot

1. Launch DeepPavlov REST API:

    ```bash
    cd nlu
    DP_SETTINGS_PATH=./deeppavlov-settings python -m deeppavlov riseapi model_config.json -p 4949
    ```

    The swagger api docs should be available at http://localhost:4949/.

2. Launch the frontend server:

    ```bash
    cd chatbot
    PORT=3000 npm start
    ```

    You should be able to access the web chat interface at http://localhost:3000/.

# Training the models

This repository comes with pre-trained models for our chatbot. If you decide to add, remove, or modify the intents and/or the entities, you will have to re-train the models.

## Intent model
```bash
python -m deeppavlov train intents.json
```

## Entities model

```bash
python -m deeppavlov train ner.json
```

# Docker

docker build -t ehrhart/deeppavlov-restaurants/chatbot .
docker run -p 3000:3000 -d ehrhart/deeppavlov-restaurants/chatbot
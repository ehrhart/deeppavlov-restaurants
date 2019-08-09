# Copyright 2017 Neural Networks and Deep Learning lab, MIPT
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import logging
from typing import List, Tuple, Dict

from deeppavlov.core.commands.utils import expand_path
from deeppavlov.core.common.registry import register
from deeppavlov.core.data.data_learning_iterator import DataLearningIterator

logger = logging.getLogger(__name__)


@register('custom_ner_iterator')
class Dstc2NerDatasetIterator(DataLearningIterator):
    """
    Iterates over data for DSTC2 NER task. Dataset takes a dict with fields 'train', 'test', 'valid'. A list of samples
    (pairs x, y) is stored in each field.

    Args:
        data: list of (x, y) pairs, samples from the dataset: x as well as y can be a tuple of different input features.
        dataset_path: path to dataset
        seed: value for random seed
        shuffle: whether to shuffle the data
    """
    def __init__(self, data: Dict[str, List[Tuple]], dataset_path: str, seed: int = None, shuffle: bool = False):
        logger.info('dataset_path = ' + dataset_path)
        dataset_path = expand_path(dataset_path) / 'slot_vals.json'
        with open(dataset_path, encoding='utf8') as f:
            self._slot_vals = json.load(f)
        super().__init__(data, seed, shuffle)

    def preprocess(self, data_part, *args, **kwargs):
        processed_data_part = list()
        processed_texts = dict()
        for sample in data_part:
            for utterance in sample:
                if 'intents' not in utterance or len(utterance['text']) < 1:
                    continue
                text = utterance['text']
                intents = utterance.get('intents', dict())
                slots = list()
                for intent in intents:

                    current_slots = intent.get('slots', [])
                    for slot_type, slot_val in current_slots:
                        if slot_type in self._slot_vals:
                            slots.append((slot_type, slot_val,))

                # remove duplicate pairs (text, slots)
                if (text in processed_texts) and (slots in processed_texts[text]):
                    continue
                processed_texts[text] = processed_texts.get(text, []) + [slots]

                processed_data_part.append(self._add_bio_markup(text, slots))
        return processed_data_part

    def _add_bio_markup(self, utterance, slots):
        tokens = utterance.split()
        n_toks = len(tokens)
        tags = ['O' for _ in range(n_toks)]
        for n in range(n_toks):
            for slot_type, slot_val in slots:
                if not slot_type in self._slot_vals:
                    logger.error("Val not found for slot type " + slot_type);
                elif not slot_val in self._slot_vals[slot_type]:
                    logger.error("Val not found for slot type " + slot_type + " and slot val " + slot_val)
                else:
                    for entity in self._slot_vals[slot_type][slot_val]:
                        slot_tokens = entity.split()
                        slot_len = len(slot_tokens)
                        if n + slot_len <= n_toks and self._is_equal_sequences(tokens[n: n + slot_len],
                                                                            slot_tokens):
                            tags[n] = 'B-' + slot_type
                            for k in range(1, slot_len):
                                tags[n + k] = 'I-' + slot_type
                            break
        return tokens, tags

    @staticmethod
    def _is_equal_sequences(seq1, seq2):
        equality_list = [tok1 == tok2 for tok1, tok2 in zip(seq1, seq2)]
        return all(equality_list)
